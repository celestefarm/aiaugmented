from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from models.user import UserInDB
from utils.dependencies import get_current_user
from utils.seed_agents import get_agent_by_id
from utils.cognitive_analysis import CognitiveAnalyzer, MentorshipEngine
from database import get_database
from bson import ObjectId
from datetime import datetime
import httpx
import json
import os

router = APIRouter(tags=["interactions"])

# Initialize cognitive components
cognitive_analyzer = CognitiveAnalyzer()
mentorship_engine = MentorshipEngine()


class InteractionRequest(BaseModel):
    """Request model for agent interactions"""
    agent_id: str = Field(..., description="ID of the agent to interact with")
    prompt: str = Field(..., min_length=1, max_length=5000, description="User prompt for the agent")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context for the interaction")


class InteractionResponse(BaseModel):
    """Response model for agent interactions"""
    agent_id: str
    agent_name: str
    response: str
    model_used: Optional[str] = None
    cognitive_insights: Optional[Dict[str, Any]] = None
    mentorship_guidance: Optional[Dict[str, Any]] = None


async def call_openai_api(model: str, prompt: str, system_prompt: str) -> str:
    """Call OpenAI API with the given model and prompts"""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="OpenAI API key not configured"
        )
    
    # Extract model name (remove provider prefix if present)
    model_name = model.split("/")[-1] if "/" in model else model
    
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
        "max_tokens": 1000,
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload,
                timeout=30.0
            )
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
            
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"OpenAI API error: {e.response.status_code}"
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


def create_system_prompt(agent) -> str:
    """Create a system prompt based on the agent's configuration"""
    base_prompt = f"""You are the {agent.name}, a specialized AI assistant with the following characteristics:

Role: {agent.full_description.get('role', 'AI Assistant')}
Mission: {agent.full_description.get('mission', 'Assist users with their queries')}

AI Capabilities: {agent.ai_role}
Human Collaboration: {agent.human_role}

Expertise Areas: {', '.join(agent.full_description.get('expertise', []))}
Approach: {agent.full_description.get('approach', 'Professional and helpful assistance')}

Please respond in character as this agent, providing insights and recommendations that align with your role and expertise. Be specific, actionable, and professional in your responses."""

    return base_prompt


def create_strategic_copilot_prompt(agent, user_profile=None, cognitive_analysis=None) -> str:
    """Create enhanced system prompt for Strategic Co-Pilot with Cognitive Twin capabilities"""
    
    base_prompt = f"""You are the {agent.name}, a wise Strategic Co-Pilot and Cognitive Twin.

CORE IDENTITY:
- You are not just an advisor, but a mentor who develops the user's strategic thinking
- You analyze their thinking patterns and adapt your guidance accordingly
- You ask thought-provoking questions rather than giving direct answers
- You challenge assumptions gently but persistently
- You help users discover insights through guided exploration

COGNITIVE TWIN CAPABILITIES:
- Analyze thinking patterns in real-time
- Detect and address cognitive biases constructively
- Adapt communication style to user preferences
- Build on previous interactions and learning
- Provide personalized strategic guidance

MENTORSHIP APPROACH:
1. Lead with curiosity - ask questions that spark deeper thinking
2. Challenge assumptions respectfully and constructively
3. Offer multiple perspectives on strategic challenges
4. Use analogies and examples to illustrate complex concepts
5. Connect tactical decisions to strategic implications
6. Encourage reflection on lessons learned
7. Suggest relevant frameworks when appropriate

STRATEGIC EXPERTISE:
- Frameworks: {', '.join(agent.full_description.get('wisdom_base', {}).get('strategic_models', []))}
- Cognitive Tools: {', '.join(agent.full_description.get('wisdom_base', {}).get('cognitive_frameworks', []))}
- Mentorship Techniques: {', '.join(agent.full_description.get('wisdom_base', {}).get('mentorship_techniques', []))}
"""

    if user_profile:
        base_prompt += f"""
USER COGNITIVE PROFILE:
- Communication Style: {user_profile.get('communication_style', 'balanced')}
- Interaction Count: {user_profile.get('interaction_count', 0)}
- Growth Areas: {', '.join(user_profile.get('growth_areas', []))}
- Previous Patterns: {', '.join(user_profile.get('thinking_patterns', {}).keys())}
"""

    if cognitive_analysis:
        base_prompt += f"""
CURRENT INTERACTION ANALYSIS:
- Thinking Patterns Detected: {', '.join(cognitive_analysis.get('thinking_patterns', {}).keys())}
- Communication Style: {cognitive_analysis.get('communication_style', 'balanced')}
- Complexity Level: {cognitive_analysis.get('complexity_level', 'medium')}
- Emotional Tone: {cognitive_analysis.get('emotional_tone', 'neutral')}
- Biases Detected: {', '.join(cognitive_analysis.get('biases_detected', []))}
- Decision Indicators: {cognitive_analysis.get('decision_indicators', {})}
"""

    base_prompt += """
RESPONSE GUIDELINES:
- Adapt your response to the user's cognitive style and current state
- If biases are detected, address them constructively through questions
- If the user seems analytical, challenge them to consider creative alternatives
- If they're being creative, help them think through practical implications
- Always aim to expand their perspective while building on their strengths
- Use their preferred communication style but gently stretch their comfort zone
- Remember previous interactions and build on established learning

Your goal is to develop their strategic thinking capabilities, not just solve their immediate problem."""

    return base_prompt


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
        
        return {
            "agent_id": agent.agent_id,
            "name": agent.name,
            "ai_role": agent.ai_role,
            "human_role": agent.human_role,
            "model_name": agent.model_name,
            "is_active": agent.is_active,
            "is_custom": agent.is_custom,
            "full_description": agent.full_description,
            "capabilities": {
                "can_interact": bool(agent.model_name),
                "supported_models": ["openai/gpt-4", "openai/gpt-3.5-turbo"] if agent.model_name and agent.model_name.startswith("openai/") else []
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get agent info: {str(e)}"
        )