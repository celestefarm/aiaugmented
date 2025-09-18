from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from models.user import UserInDB
from utils.dependencies import get_current_user
from utils.seed_agents import get_agent_by_id
import httpx
import json
import os

router = APIRouter(tags=["interactions"])


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