from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from models.agent import (
    AgentResponse, 
    AgentListResponse, 
    AgentCreateRequest, 
    AgentCreate,
    AgentInDB
)
from models.workspace import WorkspaceInDB
from models.user import UserInDB
from utils.dependencies import get_current_user
from utils.seed_agents import get_all_agents, get_agent_by_id, create_custom_agent
from database import get_database
from bson import ObjectId
import uuid

router = APIRouter(tags=["agents"])


@router.get("/agents", response_model=AgentListResponse)
async def list_agents(current_user: UserInDB = Depends(get_current_user)):
    """
    List all available agents (both default and custom).
    """
    try:
        agents = await get_all_agents()
        agent_responses = [agent.to_response() for agent in agents]
        
        return AgentListResponse(
            agents=agent_responses,
            total=len(agent_responses)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve agents: {str(e)}"
        )


@router.post("/workspaces/{workspace_id}/agents/{agent_id}/activate")
async def activate_agent(
    workspace_id: str,
    agent_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Activate an agent for a specific workspace.
    """
    try:
        # Validate workspace_id format
        if not ObjectId.is_valid(workspace_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid workspace ID format"
            )
        
        db = get_database()
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection not available"
            )
        
        # Check if workspace exists and user owns it
        workspaces_collection = db.workspaces
        workspace_doc = await workspaces_collection.find_one({
            "_id": ObjectId(workspace_id),
            "owner_id": current_user.id
        })
        
        if not workspace_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found or access denied"
            )
        
        # Check if agent exists
        agent = await get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Get current workspace settings
        workspace = WorkspaceInDB(**workspace_doc)
        current_settings = workspace.settings or {}
        active_agents = current_settings.get("active_agents", [])
        
        # Add agent to active list if not already present
        if agent_id not in active_agents:
            active_agents.append(agent_id)
            current_settings["active_agents"] = active_agents
            
            # Update workspace settings
            await workspaces_collection.update_one(
                {"_id": ObjectId(workspace_id)},
                {
                    "$set": {
                        "settings": current_settings,
                        "updated_at": workspace.updated_at
                    }
                }
            )
        
        return {
            "message": f"Agent '{agent.name}' activated for workspace",
            "agent_id": agent_id,
            "workspace_id": workspace_id,
            "active_agents": active_agents
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to activate agent: {str(e)}"
        )


@router.delete("/workspaces/{workspace_id}/agents/{agent_id}/activate")
async def deactivate_agent(
    workspace_id: str,
    agent_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Deactivate an agent for a workspace.
    """
    try:
        # Validate workspace_id format
        if not ObjectId.is_valid(workspace_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid workspace ID format"
            )
        
        db = get_database()
        if db is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database connection not available"
            )
        
        # Check if workspace exists and user owns it
        workspaces_collection = db.workspaces
        workspace_doc = await workspaces_collection.find_one({
            "_id": ObjectId(workspace_id),
            "owner_id": current_user.id
        })
        
        if not workspace_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found or access denied"
            )
        
        # Check if agent exists
        agent = await get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Get current workspace settings
        workspace = WorkspaceInDB(**workspace_doc)
        current_settings = workspace.settings or {}
        active_agents = current_settings.get("active_agents", [])
        
        # Remove agent from active list if present
        if agent_id in active_agents:
            active_agents.remove(agent_id)
            current_settings["active_agents"] = active_agents
            
            # Update workspace settings
            await workspaces_collection.update_one(
                {"_id": ObjectId(workspace_id)},
                {
                    "$set": {
                        "settings": current_settings,
                        "updated_at": workspace.updated_at
                    }
                }
            )
        
        return {
            "message": f"Agent '{agent.name}' deactivated for workspace",
            "agent_id": agent_id,
            "workspace_id": workspace_id,
            "active_agents": active_agents
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to deactivate agent: {str(e)}"
        )


@router.post("/agents/custom", response_model=AgentResponse)
async def create_custom_agent_endpoint(
    agent_request: AgentCreateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Allow users to create a new custom agent.
    """
    try:
        # Generate unique agent_id for custom agent
        agent_id = f"custom-{uuid.uuid4().hex[:8]}"
        
        # Create agent data
        agent_create = AgentCreate(
            agent_id=agent_id,
            name=agent_request.name,
            ai_role=agent_request.ai_role,
            human_role=agent_request.human_role,
            is_custom=True,
            is_active=True,
            full_description=agent_request.full_description or {}
        )
        
        # Create the agent
        created_agent = await create_custom_agent(agent_create)
        
        if not created_agent:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create custom agent"
            )
        
        return created_agent.to_response()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create custom agent: {str(e)}"
        )