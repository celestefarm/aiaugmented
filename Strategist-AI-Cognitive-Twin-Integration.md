# Integrating Cognitive Twin into Existing Strategist AI

## Overview

This document shows exactly how to enhance your existing Strategist AI with Cognitive Twin capabilities, transforming it from a simple Q&A agent into a wise Strategic Co-Pilot that learns from user interactions and provides personalized mentorship.

## Current Strategist AI Enhancement

### 1. Upgrade Existing Strategist Agent Configuration

**File to Modify**: `backend/utils/seed_agents.py`

**Current Strategist Agent**:
```python
{
    "agent_id": "strategist",
    "name": "Strategist Agent",
    "ai_role": "Frame 2-3 strategic options, identify key trade-offs",
    "human_role": "Define success metrics, apply contextual judgment",
    # ... existing configuration
}
```

**Enhanced Strategist Agent with Cognitive Twin**:
```python
{
    "agent_id": "strategist",
    "name": "Strategic Co-Pilot",  # Enhanced name
    "ai_role": "Wise strategic mentor who analyzes your thinking patterns and guides you through Socratic dialogue to develop deeper strategic insights",
    "human_role": "Provide strategic context, validate insights, and apply judgment to personalized recommendations",
    "is_custom": False,
    "is_active": True,
    "model_name": "openai/gpt-4",
    "full_description": {
        "role": "Strategic Co-Pilot & Cognitive Twin",
        "mission": "Transform strategic thinking through personalized mentorship, cognitive pattern analysis, and decision sandbox testing",
        "expertise": [
            "Strategic planning", "Cognitive pattern analysis", "Socratic dialogue",
            "Decision simulation", "Bias detection", "Communication adaptation",
            "Mentorship guidance", "Framework application"
        ],
        "approach": "Personalized mentorship that adapts to your thinking style and develops your strategic capabilities",
        
        # NEW: Cognitive Twin Capabilities
        "cognitive_twin_config": {
            "pattern_analysis_enabled": True,
            "bias_detection_enabled": True,
            "learning_adaptation_enabled": True,
            "personalization_level": "high"
        },
        
        # NEW: Mentorship Configuration
        "mentorship_config": {
            "socratic_enabled": True,
            "coaching_style": "challenging_but_supportive",
            "expertise_depth": "expert",
            "personality_traits": ["wise", "patient", "insightful", "challenging"],
            "question_types": ["assumption_challenging", "perspective_expanding", "depth_probing"]
        },
        
        # NEW: Strategic Wisdom Base
        "wisdom_base": {
            "strategic_models": [
                "Porter's Five Forces", "SWOT Analysis", "Blue Ocean Strategy",
                "Balanced Scorecard", "OKRs", "Lean Canvas", "Business Model Canvas",
                "PESTLE Analysis", "Value Chain Analysis", "BCG Matrix"
            ],
            "cognitive_frameworks": [
                "Systems Thinking", "Design Thinking", "Critical Thinking",
                "Decision Analysis", "Risk Assessment", "Stakeholder Analysis"
            ],
            "mentorship_techniques": [
                "Socratic Questioning", "Assumption Challenging", "Perspective Taking",
                "Scenario Planning", "Reflection Facilitation", "Insight Synthesis"
            ]
        },
        
        # NEW: Decision Sandbox Capabilities
        "sandbox_config": {
            "scenario_types": ["strategy_test", "role_play", "what_if", "competitive_analysis"],
            "simulation_depth": "advanced",
            "outcome_modeling": True,
            "learning_extraction": True
        }
    }
}
```

### 2. Enhance Agent Interaction System

**File to Modify**: `backend/routers/interactions.py`

**Add Cognitive Analysis to Existing Interaction**:

```python
# Add these imports at the top
from utils.cognitive_analysis import CognitiveAnalyzer, MentorshipEngine
from datetime import datetime

# Initialize cognitive components
cognitive_analyzer = CognitiveAnalyzer()
mentorship_engine = MentorshipEngine()

# Modify the existing interact_with_agent function
@router.post("/agents/interact", response_model=InteractionResponse)
async def interact_with_agent(
    request: InteractionRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Enhanced agent interaction with Cognitive Twin capabilities
    """
    try:
        # Get the agent (existing code)
        agent = await get_agent_by_id(request.agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # NEW: Cognitive Analysis for Strategist Agent
        cognitive_analysis = None
        user_profile = None
        mentorship_guidance = None
        
        if agent.agent_id == "strategist":
            # Analyze user's message for cognitive patterns
            cognitive_analysis = cognitive_analyzer.analyze_message(
                request.prompt, 
                str(current_user.id)
            )
            
            # Get user's cognitive profile
            user_profile = await get_user_cognitive_profile(current_user.id)
            
            # Generate mentorship guidance
            mentorship_guidance = mentorship_engine.generate_mentorship_response(
                request.prompt, 
                cognitive_analysis, 
                user_profile
            )
            
            # Update user's cognitive profile
            await update_cognitive_profile(current_user.id, cognitive_analysis)
        
        # Create enhanced system prompt
        if agent.agent_id == "strategist":
            system_prompt = create_strategic_copilot_prompt(agent, user_profile, cognitive_analysis)
        else:
            system_prompt = create_system_prompt(agent)  # Existing function
        
        # Add context to the user prompt if provided (existing code)
        user_prompt = request.prompt
        if request.context:
            context_str = json.dumps(request.context, indent=2)
            user_prompt = f"Context: {context_str}\n\nQuery: {request.prompt}"
        
        # NEW: Add mentorship context for Strategist
        if agent.agent_id == "strategist" and mentorship_guidance:
            mentorship_context = f"""
MENTORSHIP GUIDANCE:
- Response Type: {mentorship_guidance.get('response_type', 'supportive')}
- Learning Objective: {mentorship_guidance.get('learning_objective', 'general')}
- Guidance Type: {mentorship_guidance.get('guidance_type', 'general')}

COGNITIVE INSIGHTS:
- Thinking Patterns: {', '.join(cognitive_analysis.get('thinking_patterns', {}).keys())}
- Communication Style: {cognitive_analysis.get('communication_style', 'balanced')}
- Biases Detected: {', '.join(cognitive_analysis.get('biases_detected', []))}

Please respond as a wise Strategic Co-Pilot, incorporating these insights into your mentorship approach.
"""
            user_prompt = f"{mentorship_context}\n\nUser Message: {request.prompt}"
        
        # Call AI model (existing code)
        if agent.model_name.startswith("openai/") or agent.model_name.startswith("gpt-"):
            ai_response = await call_openai_api(agent.model_name, user_prompt, system_prompt)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported model: {agent.model_name}"
            )
        
        # NEW: Enhanced response for Strategist
        enhanced_response = ai_response
        if agent.agent_id == "strategist" and mentorship_guidance:
            # Add cognitive insights to response metadata
            enhanced_response = {
                "content": ai_response,
                "cognitive_insights": cognitive_analysis,
                "mentorship_guidance": mentorship_guidance,
                "learning_suggestions": generate_learning_suggestions(cognitive_analysis, user_profile)
            }
        
        return InteractionResponse(
            agent_id=agent.agent_id,
            agent_name=agent.name,
            response=ai_response,  # Keep existing format for compatibility
            model_used=agent.model_name,
            # NEW: Add cognitive metadata (optional, for future use)
            metadata={
                "cognitive_analysis": cognitive_analysis,
                "mentorship_guidance": mentorship_guidance
            } if agent.agent_id == "strategist" else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to interact with agent: {str(e)}"
        )

# NEW: Helper functions for Cognitive Twin
async def get_user_cognitive_profile(user_id: str) -> dict:
    """Get user's cognitive profile from database"""
    db = get_database()
    profiles_collection = db.cognitive_profiles
    
    profile = await profiles_collection.find_one({"user_id": ObjectId(user_id)})
    if profile:
        profile["_id"] = str(profile["_id"])
        return profile
    return {}

async def update_cognitive_profile(user_id: str, cognitive_analysis: dict):
    """Update user's cognitive profile with new analysis"""
    db = get_database()
    profiles_collection = db.cognitive_profiles
    
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

def create_strategic_copilot_prompt(agent, user_profile=None, cognitive_analysis=None) -> str:
    """Create enhanced system prompt for Strategic Co-Pilot"""
    
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

def generate_learning_suggestions(cognitive_analysis: dict, user_profile: dict) -> list:
    """Generate personalized learning suggestions"""
    suggestions = []
    
    # Based on thinking patterns
    patterns = cognitive_analysis.get('thinking_patterns', {})
    if 'analytical' in patterns and patterns['analytical'] > 0.7:
        suggestions.append("Try approaching this challenge from a more creative angle")
    
    if 'creative' in patterns and patterns['creative'] > 0.7:
        suggestions.append("Consider the practical implementation details of your ideas")
    
    # Based on detected biases
    biases = cognitive_analysis.get('biases_detected', [])
    if 'anchoring' in biases:
        suggestions.append("Challenge your initial assumptions - what if you started fresh?")
    
    if 'confirmation_bias' in biases:
        suggestions.append("Actively seek evidence that contradicts your current view")
    
    # Based on decision indicators
    decision_indicators = cognitive_analysis.get('decision_indicators', {})
    if decision_indicators.get('expressing_uncertainty'):
        suggestions.append("Break down the decision into smaller, more manageable components")
    
    return suggestions
```

### 3. Add Cognitive Analysis Utility

**New File**: `backend/utils/cognitive_analysis.py`

```python
import re
from typing import Dict, List, Any, Optional
from datetime import datetime

class CognitiveAnalyzer:
    """Analyzes user messages for cognitive patterns and insights"""
    
    def __init__(self):
        # Thinking pattern keywords
        self.thinking_patterns = {
            "analytical": ["analyze", "data", "metrics", "numbers", "statistics", "evidence", "research", "study"],
            "creative": ["innovative", "creative", "brainstorm", "imagine", "what if", "outside the box", "novel"],
            "systematic": ["process", "step by step", "methodology", "framework", "structure", "organized"],
            "intuitive": ["feel", "sense", "gut", "instinct", "seems like", "appears", "hunch"],
            "risk_aware": ["risk", "danger", "threat", "concern", "worry", "problem", "issue"],
            "opportunity_focused": ["opportunity", "potential", "growth", "advantage", "benefit", "upside"]
        }
        
        # Cognitive bias indicators
        self.cognitive_biases = {
            "anchoring": ["first", "initial", "originally", "started with", "based on"],
            "confirmation_bias": ["proves", "confirms", "validates", "supports my view", "as expected"],
            "availability_heuristic": ["recently", "just heard", "saw on news", "everyone knows"],
            "overconfidence": ["definitely", "certainly", "obviously", "clearly", "without doubt"]
        }

    def analyze_message(self, message_content: str, user_id: str) -> Dict[str, Any]:
        """Analyze a user message for cognitive patterns"""
        content_lower = message_content.lower()
        
        return {
            "thinking_patterns": self._detect_thinking_patterns(content_lower),
            "biases_detected": self._detect_biases(content_lower),
            "communication_style": self._detect_communication_style(content_lower),
            "complexity_level": self._assess_complexity(message_content),
            "emotional_tone": self._detect_emotional_tone(content_lower),
            "decision_indicators": self._detect_decision_indicators(content_lower),
            "strategic_frameworks_mentioned": self._detect_frameworks(content_lower)
        }

    def _detect_thinking_patterns(self, content: str) -> Dict[str, float]:
        """Detect thinking patterns with confidence scores"""
        patterns = {}
        
        for pattern_name, keywords in self.thinking_patterns.items():
            matches = sum(1 for keyword in keywords if keyword in content)
            if matches > 0:
                # Normalize score between 0 and 1
                patterns[pattern_name] = min(matches / len(keywords), 1.0)
        
        return patterns

    def _detect_biases(self, content: str) -> List[str]:
        """Detect potential cognitive biases"""
        detected_biases = []
        
        for bias_name, indicators in self.cognitive_biases.items():
            if any(indicator in content for indicator in indicators):
                detected_biases.append(bias_name)
        
        return detected_biases

    def _detect_communication_style(self, content: str) -> str:
        """Detect primary communication style"""
        styles = {
            "data_driven": ["statistics", "data shows", "research indicates", "studies prove"],
            "narrative": ["story", "example", "case", "situation", "scenario"],
            "visual": ["picture", "diagram", "chart", "visualize", "see"],
            "collaborative": ["we", "us", "together", "team", "group"]
        }
        
        style_scores = {}
        for style_name, indicators in styles.items():
            score = sum(1 for indicator in indicators if indicator in content)
            if score > 0:
                style_scores[style_name] = score
        
        return max(style_scores, key=style_scores.get) if style_scores else "balanced"

    def _assess_complexity(self, content: str) -> str:
        """Assess complexity level of the message"""
        word_count = len(content.split())
        sentence_count = len(re.split(r'[.!?]+', content))
        avg_sentence_length = word_count / max(sentence_count, 1)
        
        if avg_sentence_length > 20 and word_count > 100:
            return "high"
        elif avg_sentence_length > 10 and word_count > 50:
            return "medium"
        else:
            return "low"

    def _detect_emotional_tone(self, content: str) -> str:
        """Detect emotional tone"""
        positive_words = ["excited", "confident", "optimistic", "great", "excellent", "love"]
        negative_words = ["worried", "concerned", "frustrated", "difficult", "problem", "issue"]
        
        positive_score = sum(1 for word in positive_words if word in content)
        negative_score = sum(1 for word in negative_words if word in content)
        
        if positive_score > negative_score:
            return "positive"
        elif negative_score > positive_score:
            return "negative"
        else:
            return "neutral"

    def _detect_decision_indicators(self, content: str) -> Dict[str, bool]:
        """Detect decision-making indicators"""
        return {
            "seeking_advice": any(phrase in content for phrase in ["what should", "how do", "advice", "recommend"]),
            "comparing_options": any(phrase in content for phrase in ["versus", "vs", "compare", "option"]),
            "expressing_uncertainty": any(phrase in content for phrase in ["not sure", "uncertain", "don't know"]),
            "ready_to_decide": any(phrase in content for phrase in ["ready to", "going to", "will", "decided"])
        }

    def _detect_frameworks(self, content: str) -> List[str]:
        """Detect mentions of strategic frameworks"""
        frameworks = [
            "swot", "porter", "five forces", "blue ocean", "lean canvas",
            "business model canvas", "okr", "balanced scorecard", "pestle"
        ]
        
        return [framework for framework in frameworks if framework in content]

class MentorshipEngine:
    """Generates mentorship responses based on cognitive analysis"""
    
    def generate_mentorship_response(self, 
                                   user_message: str, 
                                   cognitive_analysis: Dict[str, Any],
                                   user_profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Generate mentorship guidance based on analysis"""
        
        # Determine response strategy
        if cognitive_analysis.get("biases_detected"):
            response_type = "bias_awareness"
        elif cognitive_analysis.get("decision_indicators", {}).get("seeking_advice"):
            response_type = "socratic_questioning"
        elif not cognitive_analysis.get("strategic_frameworks_mentioned"):
            response_type = "framework_suggestion"
        else:
            response_type = "supportive_guidance"
        
        return {
            "response_type": response_type,
            "guidance_type": self._get_guidance_type(cognitive_analysis),
            "learning_objective": self._get_learning_objective(cognitive_analysis),
            "follow_up_needed": True,
            "personalization_notes": self._get_personalization_notes(cognitive_analysis, user_profile)
        }

    def _get_guidance_type(self, analysis: Dict[str, Any]) -> str:
        """Determine specific guidance type"""
        if analysis.get("biases_detected"):
            return "challenge_assumptions"
        elif "analytical" in analysis.get("thinking_patterns", {}):
            return "expand_creativity"
        elif "creative" in analysis.get("thinking_patterns", {}):
            return "ground_in_reality"
        else:
            return "balanced_exploration"

    def _get_learning_objective(self, analysis: Dict[str, Any]) -> str:
        """Determine learning objective"""
        if analysis.get("biases_detected"):
            return "recognize_biases"
        elif analysis.get("decision_indicators", {}).get("expressing_uncertainty"):
            return "build_confidence"
        else:
            return "develop_strategic_thinking"

    def _get_personalization_notes(self, analysis: Dict[str, Any], profile: Optional[Dict[str, Any]]) -> List[str]:
        """Generate personalization notes for the AI"""
        notes = []
        
        # Based on communication style
        style = analysis.get("communication_style", "balanced")
        if style == "data_driven":
            notes.append("User prefers data-backed responses")
        elif style == "narrative":
            notes.append("User responds well to stories and examples")
        
        # Based on thinking patterns
        patterns = analysis.get("thinking_patterns", {})
        if "analytical" in patterns:
            notes.append("Challenge with creative alternatives")
        if "creative" in patterns:
            notes.append("Ground ideas in practical implementation")
        
        return notes
```

### 4. Database Schema for Cognitive Profiles

**Add to your MongoDB collections**:

```javascript
// New collection: cognitive_profiles
{
  _id: ObjectId,
  user_id: ObjectId,
  thinking_patterns: {
    analytical: 0.8,
    creative: 0.6,
    systematic: 0.9,
    intuitive: 0.4
  },
  communication_style: "data_driven",
  interaction_count: 15,
  growth_areas: ["creative_thinking", "stakeholder_management"],
  interaction_history: [
    {
      timestamp: ISODate,
      analysis: {
        thinking_patterns: {...},
        biases_detected: [...],
        communication_style: "...",
        // ... other analysis data
      }
    }
  ],
  created_at: ISODate,
  updated_at: ISODate
}
```

### 5. Frontend Integration

**Modify**: `frontend/src/contexts/AgentChatContext.tsx`

Add cognitive insights to the chat context:

```typescript
// Add to the sendMessage function
const sendMessage = useCallback(async (content: string): Promise<ChatMessage[]> => {
  if (!currentWorkspace?.id) {
    setChatError('No workspace selected');
    return [];
  }

  try {
    setChatError(null);
    
    // Send message to backend and get responses
    const responseMessages = await apiClient.sendMessage(currentWorkspace.id, { content });
    
    // NEW: Check if response includes cognitive insights (for Strategist agent)
    const strategistResponse = responseMessages.find(msg => 
      msg.type === 'ai' && msg.author === 'Strategic Co-Pilot'
    );
    
    if (strategistResponse && strategistResponse.metadata?.cognitive_analysis) {
      // Store cognitive insights for UI display
      setCognitiveInsights(strategistResponse.metadata.cognitive_analysis);
      setMentorshipGuidance(strategistResponse.metadata.mentorship_guidance);
    }
    
    // Update local state with all messages
    setMessages(prev => [...prev, ...responseMessages]);
    
    return responseMessages;
  } catch (err) {
    // ... existing error handling
  }
}, [currentWorkspace]);
```

## Key Benefits of This Integration

### 1. **Seamless Enhancement**
- Your existing Strategist AI becomes smarter without breaking changes
- All existing functionality continues to work
- New capabilities are added transparently

### 2. **Personalized Mentorship**
- The agent learns from each interaction
- Responses become more tailored over time
- Cognitive patterns are identified and addressed

### 3. **Intelligent Guidance**
- Socratic questioning instead of direct answers
- Bias detection and gentle correction
- Framework suggestions based on context

### 4. **Progressive Learning**
- User's strategic thinking improves over time
- Growth areas are identified and addressed
- Learning objectives are tracked and achieved

## Implementation Priority

### Phase 1: Core Cognitive Twin (Week 1-2)
1. ✅ Update Strategist Agent configuration
2. ✅ Add cognitive analysis to interactions
3. ✅ Create cognitive profile database
4. ✅ Implement basic pattern recognition

### Phase 2: Enhanced Mentorship (Week 3-4)
1. ✅ Add Socratic questioning capabilities
2. ✅ Implement bias detection and addressing
3. ✅ Create personalized response adaptation
4. ✅ Add learning objective tracking

### Phase 3: Decision Sandbox (Week 5-8)
1. Add scenario testing capabilities
2. Implement "what-if" analysis
3. Create role-playing simulations
4. Build outcome modeling

This integration transforms your Strategist AI from a simple Q&A system into a true Strategic Co-Pilot that learns, adapts, and mentors users toward better strategic thinking.