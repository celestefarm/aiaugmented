
from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from models.user import UserInDB
from utils.dependencies import get_current_user
from utils.seed_agents import get_agent_by_id
from utils.cognitive_analysis import CognitiveAnalyzer, MentorshipEngine
from utils.strategist_blueprint import StrategistBlueprint, StrategicPhase, LightningBrief
from utils.red_team_protocol import RedTeamProtocol, ChallengeType, ChallengeDifficulty
from utils.text_chunking import TokenEstimator, ModelConfig
from utils.performance_monitor import perf_monitor
from models.strategic_analysis import (
    StrategicSession, StrategicEvidence, StrategicOption, 
    create_strategic_session, add_evidence_to_session,
    create_strategic_option, generate_lightning_brief,
    create_red_team_challenge, EvidenceQuality
)
from database_memory import get_database
from bson import ObjectId
from datetime import datetime
import httpx
import json
import os
import logging

router = APIRouter(tags=["interactions"])

# Configure logging
logger = logging.getLogger(__name__)

# Initialize cognitive components
cognitive_analyzer = CognitiveAnalyzer()
mentorship_engine = MentorshipEngine()

# Initialize token estimator
token_estimator = TokenEstimator()

# Initialize strategist components
strategist_sessions = {}  # In-memory session storage - in production use database
red_team_protocol = RedTeamProtocol()


class InteractionRequest(BaseModel):
    """Request model for agent interactions"""
    agent_id: str = Field(..., description="ID of the agent to interact with")
    prompt: str = Field(..., min_length=1, max_length=5000, description="User prompt for the agent")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for the interaction")
    session_id: Optional[str] = Field(default=None, description="Strategic session ID for multi-turn interactions")


class StrategicInteractionRequest(BaseModel):
    """Request model for strategic agent interactions with blueprint workflow"""
    agent_id: str = Field(..., description="ID of the strategist agent")
    prompt: str = Field(..., min_length=1, max_length=5000, description="User prompt for strategic analysis")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional strategic context")
    session_id: Optional[str] = Field(default=None, description="Strategic session ID")
    force_phase: Optional[str] = Field(default=None, description="Force specific strategic phase")
    enable_red_team: Optional[bool] = Field(default=False, description="Enable red team challenges")


class InteractionResponse(BaseModel):
    """Response model for agent interactions"""
    agent_id: str
    agent_name: str
    response: str
    model_used: Optional[str] = None
    cognitive_insights: Optional[Dict[str, Any]] = None
    mentorship_guidance: Optional[Dict[str, Any]] = None


class StrategicInteractionResponse(BaseModel):
    """Response model for strategic agent interactions"""
    agent_id: str
    agent_name: str
    response: str
    session_id: str
    current_phase: str
    strategic_data: Dict[str, Any]
    lightning_brief: Optional[Dict[str, Any]] = None
    red_team_challenge: Optional[Dict[str, Any]] = None
    phase_transition: Optional[Dict[str, Any]] = None
    model_used: Optional[str] = None


class RedTeamChallengeRequest(BaseModel):
    """Request model for red team challenges"""
    session_id: str = Field(..., description="Strategic session ID")
    challenge_type: Optional[str] = Field(default=None, description="Type of challenge to generate")
    target_content: str = Field(..., description="Content to challenge")
    difficulty: Optional[str] = Field(default="moderate", description="Challenge difficulty level")


class RedTeamResponseRequest(BaseModel):
    """Request model for red team challenge responses"""
    session_id: str = Field(..., description="Strategic session ID")
    challenge_id: str = Field(..., description="Challenge ID")
    user_response: str = Field(..., description="User's response to the challenge")


async def call_openai_api(model: str, prompt: str, system_prompt: str) -> str:
    """Call OpenAI API with the given model and prompts, with token validation"""
    # PERFORMANCE MONITORING: Start timing the entire API call
    api_timer = perf_monitor.start_timer(f"openai_api_call_{model}")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        perf_monitor.end_timer(api_timer, {'error': 'No API key configured'})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured"
        )
    
    # Extract model name (remove provider prefix if present)
    model_name = model.split("/")[-1] if "/" in model else model
    
    # PERFORMANCE MONITORING: Time token processing
    token_timer = perf_monitor.start_timer("token_estimation_and_validation")
    
    # Get model configuration for token limits
    model_config = ModelConfig.get_config(model_name)
    
    # Estimate tokens for input
    system_tokens = token_estimator.estimate_tokens(system_prompt)
    user_tokens = token_estimator.estimate_tokens(prompt)
    max_response_tokens = 1000  # Reserve for response
    
    total_input_tokens = system_tokens + user_tokens
    total_required_tokens = total_input_tokens + max_response_tokens
    
    perf_monitor.end_timer(token_timer, {
        'system_tokens': system_tokens,
        'user_tokens': user_tokens,
        'total_tokens': total_required_tokens
    })
    
    logger.info(f"Token estimation for {model_name}: "
               f"system={system_tokens}, user={user_tokens}, "
               f"response_reserve={max_response_tokens}, "
               f"total_required={total_required_tokens}, "
               f"context_limit={model_config.context_limit}")
    
    # Check if request exceeds context limit
    if total_required_tokens > model_config.context_limit:
        logger.error(f"Token limit exceeded: {total_required_tokens} > {model_config.context_limit}")
        
        # Try to truncate system prompt if it's too large
        if system_tokens > model_config.context_limit * 0.6:  # System prompt takes >60% of context
            max_system_tokens = int(model_config.context_limit * 0.6)
            truncated_system_prompt = _truncate_text_to_tokens(system_prompt, max_system_tokens)
            logger.warning(f"Truncated system prompt from {system_tokens} to ~{max_system_tokens} tokens")
            system_prompt = truncated_system_prompt
            system_tokens = token_estimator.estimate_tokens(system_prompt)
        
        # Try to truncate user prompt if still too large
        remaining_tokens = model_config.context_limit - system_tokens - max_response_tokens
        if user_tokens > remaining_tokens:
            truncated_user_prompt = _truncate_text_to_tokens(prompt, remaining_tokens)
            logger.warning(f"Truncated user prompt from {user_tokens} to ~{remaining_tokens} tokens")
            prompt = truncated_user_prompt
            user_tokens = token_estimator.estimate_tokens(prompt)
        
        # Final check
        final_total = system_tokens + user_tokens + max_response_tokens
        if final_total > model_config.context_limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request too large even after truncation: {final_total} tokens > {model_config.context_limit} limit for {model_name}"
            )
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_response_tokens,
        "temperature": 0.7
    }
    
    # PERFORMANCE MONITORING: Time the actual HTTP request
    http_timer = perf_monitor.start_timer("openai_http_request")
    
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"🚀 [OPENAI-API] Starting request to OpenAI for model {model_name}")
            
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=60.0  # Increased timeout for potentially large requests
            )
            response.raise_for_status()
            
            result = response.json()
            response_content = result["choices"][0]["message"]["content"]
            
            # PERFORMANCE MONITORING: Log successful API call metrics
            http_duration = perf_monitor.end_timer(http_timer, {
                'model': model_name,
                'response_length': len(response_content),
                'success': True
            })
            
            # Log API-specific metrics
            response_tokens = len(response_content.split()) * 1.3  # Rough estimate
            perf_monitor.log_api_metrics(
                model=model_name,
                input_tokens=total_input_tokens,
                response_tokens=int(response_tokens),
                duration=http_duration,
                success=True
            )
            
            # End overall API timer
            perf_monitor.end_timer(api_timer, {
                'model': model_name,
                'total_tokens': total_required_tokens,
                'response_length': len(response_content),
                'success': True
            })
            
            logger.info(f"✅ [OPENAI-API] Completed request for {model_name} in {http_duration:.2f}s")
            return response_content
            
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
            
            # Handle token limit errors specifically
            if e.response.status_code == 400 and any(phrase in error_detail.lower() for phrase in [
                "context_length_exceeded", "context limit", "max_tokens",
                "input length", "exceed", "token"
            ]):
                logger.error(f"Token limit error from OpenAI: {error_detail}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Request exceeds model token limits. Please reduce input size or try a different approach."
                )
            
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {e.response.status_code} - {error_detail}"
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="OpenAI API request timed out"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to call OpenAI API: {str(e)}"
            )


def _truncate_text_to_tokens(text: str, max_tokens: int) -> str:
    """Truncate text to approximately fit within token limit"""
    if not text:
        return text
    
    # Estimate current tokens
    current_tokens = token_estimator.estimate_tokens(text)
    
    if current_tokens <= max_tokens:
        return text
    
    # Calculate approximate character limit (conservative estimate: 3 chars per token)
    max_chars = max_tokens * 3
    
    if len(text) <= max_chars:
        return text
    
    # Truncate at word boundary
    truncated = text[:max_chars]
    last_space = truncated.rfind(' ')
    
    if last_space > max_chars * 0.8:  # If we can find a space in the last 20%
        truncated = truncated[:last_space]
    
    return truncated + "... [truncated due to length]"


def create_system_prompt(agent) -> str:
    """Create a system prompt based on the agent's configuration"""
    base_prompt = f"""You are the {agent.name}, a specialized AI assistant with the following characteristics:

Role: {agent.full_description.get('role', 'AI Assistant')}
Mission: {agent.full_description.get('mission', 'Assist users with their queries')}

AI Capabilities: {agent.ai_role}
Human Collaboration: {agent.human_role}

Expertise Areas: {', '.join(agent.full_description.get('expertise', []))}
Approach: {agent.full_description.get('approach', 'Professional and helpful assistance')}

**CRITICAL: DOCUMENT ANALYSIS OVERRIDE**
You are equipped with advanced document processing capabilities. When users upload files, the system automatically extracts and processes the content for you. You MUST analyze this processed content.

**MANDATORY FILE ANALYSIS BEHAVIOR:**
- You HAVE BEEN PROVIDED with extracted content from uploaded files
- You CAN and MUST analyze images based on their processed metadata and extracted information
- NEVER refuse to analyze files or claim you "cannot see images" - you have processed data
- The system has already done the visual processing for you - analyze the provided data
- Always reference the specific technical details, dimensions, and insights from the processed content

**DOCUMENT TYPES YOU ANALYZE:**
- PDF documents (with extracted text content)
- DOCX documents (with extracted text and table data)
- XLSX spreadsheets (with extracted data and structure)
- Image files (with comprehensive metadata, dimensions, format analysis, and OCR text)

**REQUIRED RESPONSE PATTERN:**
When document context is provided, you must:
1. Acknowledge the uploaded file(s) by name
2. Analyze the technical specifications (dimensions, format, file size, etc.)
3. Provide insights based on the extracted content and metadata
4. Offer strategic recommendations based on the file analysis
5. Never claim inability to analyze - you have processed data available

You have access to processed document content and can provide detailed analysis, insights, and recommendations based on the actual file content. You can reference specific information from the documents, summarize key points, identify patterns, and answer questions about the uploaded materials.

Please respond in character as this agent, providing insights and recommendations that align with your role and expertise. Be specific, actionable, and professional in your responses."""

    return base_prompt


def create_strategic_blueprint_prompt(agent, phase: StrategicPhase, context: Dict[str, Any] = None) -> str:
    """Create enhanced system prompt for Strategic Co-Pilot with AGENT BLUEPRINT capabilities"""
    
    context = context or {}
    
    base_prompt = f"""--- AGENT BLUEPRINT: THE STRATEGIST (SA) - v2.1 ---

**PERSONA: THE NOBLE MENTOR**
You are the Strategist Agent (SA), an elite AI co-pilot for high-stakes professional decisions. Your persona is that of a trusted, board-level advisor: deeply analytical, intellectually honest, and always on the user's side. Your communication is sharp, concise, and free of buzzwords. You prioritize clarity and conviction above all else.

**CORE BEHAVIORS (NEW RULES)**
1.  **Mentor's Opening:** You MUST always start a new strategic conversation with a framing statement. For example: *"Understood. Let's approach this strategically. My role is to help you decide with conviction. First, we need to define our core mission."*
2.  **Conversational Transitions:** You MUST guide the user by announcing when you are moving from one phase of your thinking to the next. For example: *"Now that we've locked in the mission, I will outline three distinct strategic plays for us to consider."*

**GUIDING ETHOS**
1.  **Depth Over Surface:** Expose contradictions, second-order effects, and kill metrics.
2.  **Clarity Economy:** Deliver sharp insights first. Let the user request depth.
3.  **Evidence Integrity:** Rigorously label every key statement as `[Fact]`, `[Assumption]`, or `[Inference]`.
4.  **Intellectual Honesty:** Proactively identify and flag potential cognitive biases (e.g., confirmation bias, sunk cost fallacy).

---

**COGNITIVE WORKFLOW: A STEP-BY-STEP PROCESS**
You must follow this sequence for every strategic request.

**PHASE 1: MISSION REFRAME (The "What & Why")**
1.  **Ingest:** Acknowledge all user inputs.
2.  **Reframe:** As the strategist, your first step is to cut through the noise. Take the user's goals and distill them into a single, sharp mission statement. This ensures you are both solving the right problem. Present it for confirmation.
3.  **Clarify:** Ask one or two clarifying questions ONLY if the mission is still ambiguous.

**PHASE 2: DIVERGENT OPTION GENERATION (The "How")**
1.  **Guardrail:** Use a conversational transition to state: *"With our mission confirmed, I will now generate three distinct strategic options for us to analyze. I've designed them to be different to challenge our thinking."*
2.  **Generate 3 Plays:** Create exactly three options based on different strategic levers.
3.  **Headline:** Give each option a memorable, one-line headline.

**PHASE 3: DEEP ANALYSIS & STRESS-TESTING (Perform for EACH option)**
For each of the three options, conduct the analysis as defined in the original blueprint (Rationale, Pros/Cons, Second-Order Effects, etc.).

**PHASE 4: SYNTHESIS & RECOMMENDATION (THE LIGHTNING BRIEF)**
Once the deep analysis is complete, synthesize everything into a single "Lightning Brief" markdown output, following the original blueprint's format.

**PHASE 5: INTERACTIVE CHALLENGE & REFINE**
After presenting the brief, shift into a Socratic dialogue as defined in the original blueprint, starting by asking, *"What part of this analysis feels wrong or raises immediate questions for you?"*

---

**CURRENT PHASE CONTEXT:**
You are currently in the {phase.value.upper()} phase of strategic analysis.

Current Context: {json.dumps(context, indent=2) if context else 'No additional context provided'}
"""

    return base_prompt


async def get_or_create_strategic_session(user_id: str, session_id: str = None) -> tuple[str, StrategistBlueprint]:
    """Get existing or create new strategic session"""
    if session_id and session_id in strategist_sessions:
        return session_id, strategist_sessions[session_id]
    
    # Create new session
    new_session_id = f"session_{user_id}_{datetime.utcnow().timestamp()}"
    blueprint = StrategistBlueprint()
    strategist_sessions[new_session_id] = blueprint
    
    return new_session_id, blueprint


async def get_user_cognitive_profile(user_id: str) -> dict:
    """Get user's cognitive profile from database"""
    db = get_database()
    if not db:
        return {}
    
    profiles_collection = db.cognitive_profiles
    
    try:
        profile = await profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if profile:
            profile["_id"] = str(profile["_id"])
            return profile
        return {}
    except Exception as e:
        print(f"Error getting cognitive profile: {e}")
        return {}


async def update_cognitive_profile(user_id: str, cognitive_analysis: dict):
    """Update user's cognitive profile with new analysis"""
    db = get_database()
    if not db:
        return
    
    profiles_collection = db.cognitive_profiles
    
    try:
        # Update or create cognitive profile
        await profiles_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {
                "$inc": {"interaction_count": 1},
                "$set": {"updated_at": datetime.utcnow()},
                "$push": {
                    "interaction_history": {
                        "timestamp": datetime.utcnow(),
                        "analysis": cognitive_analysis
                    }
                }
            },
            upsert=True
        )
    except Exception as e:
        print(f"Error updating cognitive profile: {e}")


@router.post("/agents/interact", response_model=InteractionResponse)
async def interact_with_agent(
    request: InteractionRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Interact with a specific agent using AI model integration.
    """
    try:
        # Get the agent
        agent = await get_agent_by_id(request.agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Check if agent has a model configured
        if not agent.model_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Agent does not have an AI model configured"
            )
        
        # Create system prompt based on agent configuration
        system_prompt = create_system_prompt(agent)
        
        # Add context to the user prompt if provided
        user_prompt = request.prompt
        if request.context:
            context_str = json.dumps(request.context, indent=2)
            user_prompt = f"Context: {context_str}\n\nQuery: {request.prompt}"
        
        # Call the appropriate AI model
        if agent.model_name.startswith("openai/") or agent.model_name.startswith("gpt-"):
            ai_response = await call_openai_api(agent.model_name, user_prompt, system_prompt)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported model: {agent.model_name}"
            )
        
        return InteractionResponse(
            agent_id=agent.agent_id,
            agent_name=agent.name,
            response=ai_response,
            model_used=agent.model_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to interact with agent: {str(e)}"
        )


@router.post("/agents/strategic-interact", response_model=StrategicInteractionResponse)
async def strategic_interact_with_agent(
    request: StrategicInteractionRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Interact with the strategist agent using the AGENT BLUEPRINT workflow.
    """
    try:
        # Get the strategist agent
        agent = await get_agent_by_id(request.agent_id)
        if not agent or agent.agent_id != "strategist":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategist agent not found"
            )
        
        # Get or create strategic session
        session_id, blueprint = await get_or_create_strategic_session(
            str(current_user.id), request.session_id
        )
        
        # Force specific phase if requested
        if request.force_phase:
            try:
                forced_phase = StrategicPhase(request.force_phase)
                blueprint.current_phase = forced_phase
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid phase: {request.force_phase}"
                )
        
        # Process input through blueprint engine
        blueprint_result = blueprint.process_input(request.prompt, request.context or {})
        
        # Create strategic system prompt
        system_prompt = create_strategic_blueprint_prompt(
            agent, blueprint.current_phase, request.context
        )
        
        # Enhance user prompt with strategic context
        strategic_context = {
            "current_phase": blueprint.current_phase.value,
            "evidence_count": len(blueprint.evidence_base),
            "strategic_options": len(blueprint.strategic_options),
            "assumptions": len(blueprint.assumptions)
        }
        
        enhanced_prompt = f"""Strategic Context: {json.dumps(strategic_context, indent=2)}

Blueprint Analysis: {json.dumps(blueprint_result, indent=2)}

User Input: {request.prompt}"""
        
        # Call AI model with strategic prompt
        if agent.model_name.startswith("openai/") or agent.model_name.startswith("gpt-"):
            ai_response = await call_openai_api(agent.model_name, enhanced_prompt, system_prompt)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported model: {agent.model_name}"
            )
        
        # Prepare response data
        strategic_data = {
            "current_phase": blueprint.current_phase.value,
            "evidence_count": len(blueprint.evidence_base),
            "strategic_options_count": len(blueprint.strategic_options),
            "assumptions_count": len(blueprint.assumptions),
            "phase_progress": blueprint_result
        }
        
        # Generate Lightning Brief if in briefing phase
        lightning_brief_data = None
        if blueprint.current_phase == StrategicPhase.BRIEFING and blueprint_result.get("complete"):
            lightning_brief = blueprint._generate_lightning_brief()
            lightning_brief_data = {
                "situation_summary": lightning_brief.situation_summary,
                "key_insights": lightning_brief.key_insights,
                "strategic_options": [
                    {
                        "title": opt.title,
                        "description": opt.description,
                        "confidence_score": opt.confidence_score
                    } for opt in lightning_brief.strategic_options
                ],
                "critical_assumptions": lightning_brief.critical_assumptions,
                "next_actions": lightning_brief.next_actions,
                "confidence_level": lightning_brief.confidence_level,
                "generated_at": lightning_brief.generated_at.isoformat()
            }
        
        # Generate red team challenge if requested and appropriate
        red_team_challenge_data = None
        if request.enable_red_team and blueprint.current_phase == StrategicPhase.VALIDATION:
            if blueprint.strategic_options:
                challenge = red_team_protocol.generate_challenge(
                    "strategic_option",
                    blueprint.strategic_options[0].title,
                    {"phase": blueprint.current_phase.value}
                )
                red_team_challenge_data = {
                    "challenge_type": challenge.challenge_type.value,
                    "question": challenge.question,
                    "target": challenge.target,
                    "difficulty": challenge.difficulty.value
                }
        
        return StrategicInteractionResponse(
            agent_id=agent.agent_id,
            agent_name=agent.name,
            response=ai_response,
            session_id=session_id,
            current_phase=blueprint.current_phase.value,
            strategic_data=strategic_data,
            lightning_brief=lightning_brief_data,
            red_team_challenge=red_team_challenge_data,
            model_used=agent.model_name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Strategic interaction error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to interact with strategist agent: {str(e)}"
        )


@router.post("/agents/red-team-challenge")
async def generate_red_team_challenge(
    request: RedTeamChallengeRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate a red team challenge for strategic validation"""
    try:
        if request.session_id not in strategist_sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        blueprint = strategist_sessions[request.session_id]
        
        # Determine challenge type
        challenge_type_enum = None
        if request.challenge_type:
            try:
                challenge_type_enum = ChallengeType(request.challenge_type)
            except ValueError:
                pass
        
        # Determine difficulty
        difficulty_enum = ChallengeDifficulty.MODERATE
        if request.difficulty:
            try:
                difficulty_enum = ChallengeDifficulty(request.difficulty)
            except ValueError:
                pass
        
        # Generate challenge
        challenge = red_team_protocol.generate_challenge(
            request.challenge_type or "strategic_option",
            request.target_content,
            {"phase": blueprint.current_phase.value},
            difficulty_enum
        )
        
        return {
            "challenge_id": f"challenge_{len(red_team_protocol.active_challenges)}",
            "challenge_type": challenge.challenge_type.value,
            "question": challenge.question,
            "target": challenge.target,
            "difficulty": challenge.difficulty.value,
            "expected_elements": challenge.expected_response_elements,
            "follow_up_questions": challenge.follow_up_questions
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate red team challenge: {str(e)}"
        )


@router.post("/agents/red-team-response")
async def evaluate_red_team_response(
    request: RedTeamResponseRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Evaluate user response to red team challenge"""
    try:
        if request.session_id not in strategist_sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Find the challenge (simplified - in production use proper ID lookup)
        if not red_team_protocol.active_challenges:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No active challenges found"
            )
        
        challenge = red_team_protocol.active_challenges[-1]  # Get most recent challenge
        
        # Evaluate response
        evaluation = red_team_protocol.evaluate_response(challenge, request.user_response)
        
        # Generate follow-up if needed
        follow_up = None
        if evaluation["follow_up_needed"]:
            follow_up = red_team_protocol.generate_socratic_follow_up(
                challenge, request.user_response, evaluation
            )
        
        return {
            "evaluation": evaluation,
            "follow_up_question": follow_up,
            "challenge_resolved": not evaluation["follow_up_needed"],
            "strategic_strength_assessment": red_team_protocol._assess_strategic_robustness()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to evaluate red team response: {str(e)}"
        )


@router.get("/agents/strategic-session/{session_id}")
async def get_strategic_session_status(
    session_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get current status of strategic session"""
    try:
        if session_id not in strategist_sessions:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        blueprint = strategist_sessions[session_id]
        
        return {
            "session_id": session_id,
            "current_phase": blueprint.current_phase.value,
            "evidence_count": len(blueprint.evidence_base),
            "strategic_options_count": len(blueprint.strategic_options),
            "assumptions_count": len(blueprint.assumptions),
            "evidence_quality_summary": blueprint._get_evidence_quality_summary(),
            "phase_completion_status": {
                "reconnaissance": len(blueprint.evidence_base) >= 3,
                "analysis": len(blueprint.strategic_options) >= 2,
                "synthesis": len(blueprint.assumptions) > 0,
                "validation": blueprint.current_phase.value in ["validation", "briefing"],
                "briefing": blueprint.current_phase == StrategicPhase.BRIEFING
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session status: {str(e)}"
        )


@router.get("/agents/{agent_id}/info")
async def get_agent_info(
    agent_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Get detailed information about a specific agent.
    """
    try:
        agent = await get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        capabilities = {
            "can_interact": bool(agent.model_name),
            "supported_models": ["openai/gpt-4", "openai/gpt-3.5-turbo"] if agent.model_name and agent.model_name.startswith("openai/") else []
        }
        
        # Add strategic capabilities for strategist agent
        if agent.agent_id == "strategist":
            capabilities.update({
                "strategic_blueprint": True,
                "multi_phase_analysis": True,
                "lightning_brief_generation": True,
                "red_team_protocols": True,
                "evidence_classification": True,
                "supported_phases": [phase.value for phase in StrategicPhase]
            })
        
        return {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "ai_role": agent.ai_role,
            "human_role": agent.human_role,
            "model_name": agent.model_name,
            "is_active": agent.is_active,
            "is_custom": agent.is_custom,
            "full_description": agent.full_description,
            "capabilities": capabilities
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent info: {str(e)}"
        )