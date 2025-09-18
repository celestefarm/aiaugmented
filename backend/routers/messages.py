from fastapi import APIRouter, HTTPException, status, Depends
from models.message import (
    MessageCreateRequest,
    MessageResponse,
    MessageListResponse,
    MessageInDB,
    MessageCreate,
    AddToMapRequest,
    AddToMapResponse
)
from models.node import NodeCreate, NodeInDB
from models.user import UserResponse
from utils.dependencies import get_current_active_user
from database import get_database
from datetime import datetime
from bson import ObjectId
from typing import List
import random

router = APIRouter(tags=["Messages"])


@router.get("/workspaces/{workspace_id}/messages", response_model=MessageListResponse)
async def get_messages(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get chat history for a workspace.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
    Returns:
        List of messages in the workspace
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get messages for the workspace, sorted by creation time
    cursor = database.messages.find({"workspace_id": ObjectId(workspace_id)}).sort("created_at", 1)
    message_docs = await cursor.to_list(length=None)
    
    # Convert to response models
    messages = []
    for doc in message_docs:
        message_in_db = MessageInDB(**doc)
        messages.append(message_in_db.to_response())
    
    return MessageListResponse(
        messages=messages,
        total=len(messages)
    )


@router.post("/workspaces/{workspace_id}/messages", response_model=List[MessageResponse], status_code=status.HTTP_201_CREATED)
async def send_message(
    workspace_id: str,
    message_data: MessageCreateRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Send a message and get AI response from active agents.
    
    Args:
        workspace_id: Workspace ID
        message_data: Message content
        current_user: Current authenticated user (from dependency)
        
    Returns:
        List of messages (user message + AI responses)
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Create user message
    now = datetime.utcnow()
    user_message = MessageCreate(
        workspace_id=ObjectId(workspace_id),
        author=current_user.name,
        type="human",
        content=message_data.content,
        created_at=now,
        added_to_map=False
    )
    
    # Insert user message
    user_result = await database.messages.insert_one(user_message.model_dump())
    user_message_doc = await database.messages.find_one({"_id": user_result.inserted_id})
    user_message_response = MessageInDB(**user_message_doc).to_response()
    
    # Get active agents from workspace settings
    active_agents = workspace_doc.get("settings", {}).get("active_agents", [])
    
    # Create list to store all messages (user + AI responses)
    all_messages = [user_message_response]
    
    # Generate AI responses from active agents
    if active_agents:
        # Get agent details for active agents
        agent_cursor = database.agents.find({"agent_id": {"$in": active_agents}})
        agent_docs = await agent_cursor.to_list(length=None)
        
        for agent_doc in agent_docs:
            # Generate simulated AI response
            ai_response_content = f"This is a simulated response from {agent_doc['name']}. In response to your message about '{message_data.content[:50]}...', I would analyze this from my perspective as a {agent_doc['ai_role']}"
            
            # Create AI message
            ai_message = MessageCreate(
                workspace_id=ObjectId(workspace_id),
                author=agent_doc["name"],
                type="ai",
                content=ai_response_content,
                created_at=datetime.utcnow(),
                added_to_map=False
            )
            
            # Insert AI message
            ai_result = await database.messages.insert_one(ai_message.model_dump())
            ai_message_doc = await database.messages.find_one({"_id": ai_result.inserted_id})
            ai_message_response = MessageInDB(**ai_message_doc).to_response()
            
            all_messages.append(ai_message_response)
    
    return all_messages


@router.post("/workspaces/{workspace_id}/messages/{message_id}/add-to-map", response_model=AddToMapResponse)
async def add_message_to_map(
    workspace_id: str,
    message_id: str,
    request_data: AddToMapRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Convert a message into a new node on the Exploration Map.
    
    Args:
        workspace_id: Workspace ID
        message_id: Message ID to convert
        request_data: Optional node customization data
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Success status and created node ID
        
    Raises:
        HTTPException: If workspace/message not found, access denied, or already added to map
    """
    # Validate ObjectId formats
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    if not ObjectId.is_valid(message_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid message ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Find the message
    message_doc = await database.messages.find_one({
        "_id": ObjectId(message_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if not message_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Check if message is already added to map
    if message_doc.get("added_to_map", False):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message has already been added to map"
        )
    
    # Generate a position for the new node (simple random positioning)
    # In a real implementation, you might want smarter positioning logic
    x_position = random.uniform(100, 800)
    y_position = random.uniform(100, 600)
    
    # Create node from message
    now = datetime.utcnow()
    node_title = request_data.node_title or f"From Chat: {message_doc['content'][:50]}..."
    node_type = request_data.node_type or ("ai" if message_doc["type"] == "ai" else "human")
    
    node_create = NodeCreate(
        workspace_id=ObjectId(workspace_id),
        title=node_title,
        description=message_doc["content"],
        type=node_type,
        x=x_position,
        y=y_position,
        confidence=None,
        feasibility=None,
        source_agent=message_doc["author"] if message_doc["type"] == "ai" else None,
        created_at=now,
        updated_at=now
    )
    
    # Insert node into database
    node_result = await database.nodes.insert_one(node_create.model_dump())
    node_id = str(node_result.inserted_id)
    
    # Update message to mark as added to map
    await database.messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"added_to_map": True}}
    )
    
    return AddToMapResponse(
        success=True,
        node_id=node_id,
        message="Message successfully converted to map node"
    )