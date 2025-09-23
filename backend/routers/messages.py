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
from utils.seed_agents import get_agent_by_id
from utils.text_chunking import TokenEstimator, ModelConfig
from database_memory import get_database
from datetime import datetime
from bson import ObjectId
from typing import List, Tuple
import random
import asyncio
import math
import logging

# Import AI functions from interactions router
from routers.interactions import call_openai_api, create_system_prompt

router = APIRouter(tags=["Messages"])

# Configure logging
logger = logging.getLogger(__name__)

# Initialize token estimator
token_estimator = TokenEstimator()


async def calculate_optimal_node_position(database, workspace_id: str) -> Tuple[float, float]:
    """
    Calculate optimal position for a new node to avoid overlapping with existing nodes.
    Uses a spiral pattern starting from the center of the canvas.
    
    Args:
        database: Database instance
        workspace_id: Workspace ID to check for existing nodes
        
    Returns:
        Tuple of (x, y) coordinates for the new node
    """
    # Get all existing nodes in the workspace
    existing_nodes = await database.nodes.find({
        "$or": [
            {"workspace_id": workspace_id},  # String format
            {"workspace_id": ObjectId(workspace_id)}  # ObjectId format
        ]
    }).to_list(length=None)
    
    # Canvas dimensions and node size constants
    CANVAS_WIDTH = 1200
    CANVAS_HEIGHT = 800
    NODE_WIDTH = 280  # Approximate node width
    NODE_HEIGHT = 200  # Approximate node height
    MIN_SPACING = 50  # Minimum spacing between nodes
    
    # Starting position (center of canvas)
    center_x = CANVAS_WIDTH / 2
    center_y = CANVAS_HEIGHT / 2
    
    # If no existing nodes, place at center
    if not existing_nodes:
        return (center_x, center_y)
    
    # Extract existing positions and log them for debugging
    existing_positions = [(node.get('x', 0), node.get('y', 0)) for node in existing_nodes]
    print(f"=== POSITIONING DEBUG ===")
    print(f"Found {len(existing_nodes)} existing nodes:")
    for i, (x, y) in enumerate(existing_positions):
        print(f"  Node {i+1}: x={x}, y={y}")
    
    def is_position_valid(x: float, y: float) -> bool:
        """Check if a position doesn't overlap with existing nodes"""
        for ex_x, ex_y in existing_positions:
            # Calculate distance between nodes (including their size)
            distance_x = abs(x - ex_x)
            distance_y = abs(y - ex_y)
            
            # Check if nodes would overlap (with minimum spacing)
            if (distance_x < NODE_WIDTH + MIN_SPACING and
                distance_y < NODE_HEIGHT + MIN_SPACING):
                return False
        
        # Check if position is within canvas bounds
        if (x < NODE_WIDTH/2 or x > CANVAS_WIDTH - NODE_WIDTH/2 or
            y < NODE_HEIGHT/2 or y > CANVAS_HEIGHT - NODE_HEIGHT/2):
            return False
            
        return True
    
    # Try center position first
    if is_position_valid(center_x, center_y):
        return (center_x, center_y)
    
    # Use spiral pattern to find optimal position
    max_radius = min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2
    radius_step = NODE_WIDTH + MIN_SPACING
    angle_step = math.pi / 6  # 30 degrees
    
    for radius in range(int(radius_step), int(max_radius), int(radius_step)):
        # Calculate number of positions at this radius
        circumference = 2 * math.pi * radius
        num_positions = max(8, int(circumference / (NODE_WIDTH + MIN_SPACING)))
        actual_angle_step = 2 * math.pi / num_positions
        
        for i in range(num_positions):
            angle = i * actual_angle_step
            x = center_x + radius * math.cos(angle)
            y = center_y + radius * math.sin(angle)
            
            if is_position_valid(x, y):
                return (x, y)
    
    # Fallback: grid pattern if spiral fails
    grid_size = NODE_WIDTH + MIN_SPACING
    for row in range(1, int(CANVAS_HEIGHT / grid_size)):
        for col in range(1, int(CANVAS_WIDTH / grid_size)):
            x = col * grid_size
            y = row * grid_size
            
            if is_position_valid(x, y):
                return (x, y)
    
    # Final fallback: random position with some spacing
    for _ in range(50):  # Try 50 random positions
        x = random.uniform(NODE_WIDTH, CANVAS_WIDTH - NODE_WIDTH)
        y = random.uniform(NODE_HEIGHT, CANVAS_HEIGHT - NODE_HEIGHT)
        
        if is_position_valid(x, y):
            return (x, y)
    
    # Ultimate fallback: place at center (will overlap but at least it's visible)
    return (center_x, center_y)


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
        "owner_id": current_user.id
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
        # Convert ObjectId to string for Pydantic validation
        doc["_id"] = str(doc["_id"])
        doc["workspace_id"] = str(doc["workspace_id"])
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
        "owner_id": current_user.id
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Create user message
    now = datetime.utcnow()
    user_message = MessageCreate(
        workspace_id=workspace_id,
        author=current_user.name,
        type="human",
        content=message_data.content,
        created_at=now,
        added_to_map=False
    )
    
    # Insert user message
    user_result = await database.messages.insert_one(user_message.model_dump())
    user_message_doc = await database.messages.find_one({"_id": user_result.inserted_id})
    # Convert ObjectId to string for Pydantic validation
    user_message_doc["_id"] = str(user_message_doc["_id"])
    user_message_doc["workspace_id"] = str(user_message_doc["workspace_id"])
    user_message_response = MessageInDB(**user_message_doc).to_response()
    
    # Get active agents from workspace settings
    active_agents = workspace_doc.get("settings", {}).get("active_agents", [])
    
    # If no agents are active, automatically activate the strategist agent for better UX
    if not active_agents:
        active_agents = ["strategist"]
        # Update workspace settings to persist the activation
        current_settings = workspace_doc.get("settings", {})
        current_settings["active_agents"] = active_agents
        await database.workspaces.update_one(
            {"_id": ObjectId(workspace_id)},
            {"$set": {"settings": current_settings}}
        )
    
    # Create list to store all messages (user + AI responses)
    all_messages = [user_message_response]
    
    # Generate AI responses from active agents
    if active_agents:
        # Get agent details for active agents
        agent_cursor = database.agents.find({"agent_id": {"$in": active_agents}})
        agent_docs = await agent_cursor.to_list(length=None)
        
        for agent_doc in agent_docs:
            try:
                # Get the full agent object for AI integration
                agent = await get_agent_by_id(agent_doc["agent_id"])
                if not agent or not agent.model_name:
                    # Fallback to simple response if agent not found or no model configured
                    ai_response_content = f"I'm {agent_doc['name']}, ready to help with {agent_doc.get('ai_role', 'various tasks')}. However, my AI model is not currently configured."
                else:
                    # Generate intelligent AI response using the proper framework
                    system_prompt = create_system_prompt(agent)
                    user_prompt = message_data.content
                    
                    # Validate token limits before making API call
                    model_name = agent.model_name.split("/")[-1] if "/" in agent.model_name else agent.model_name
                    model_config = ModelConfig.get_config(model_name)
                    
                    system_tokens = token_estimator.estimate_tokens(system_prompt)
                    user_tokens = token_estimator.estimate_tokens(user_prompt)
                    max_response_tokens = 1000
                    total_required = system_tokens + user_tokens + max_response_tokens
                    
                    logger.info(f"Agent {agent_doc['name']} token check: "
                               f"system={system_tokens}, user={user_tokens}, "
                               f"total_required={total_required}, limit={model_config.context_limit}")
                    
                    # If the request is too large, provide a fallback response
                    if total_required > model_config.context_limit:
                        logger.warning(f"Agent {agent_doc['name']} request too large: {total_required} > {model_config.context_limit}")
                        ai_response_content = f"I'm {agent_doc['name']}, your {agent_doc.get('ai_role', 'AI assistant')}. Your message is quite detailed, which I appreciate! However, due to processing limits, I'll need you to break it down into smaller, more focused questions so I can provide you with the best possible assistance. Could you please rephrase your query in a more concise way?"
                    else:
                        # Call the appropriate AI model
                        if agent.model_name.startswith("openai/") or agent.model_name.startswith("gpt-"):
                            ai_response_content = await call_openai_api(agent.model_name, user_prompt, system_prompt)
                        else:
                            # Fallback for unsupported models
                            ai_response_content = f"I'm {agent_doc['name']}, specialized in {agent_doc.get('ai_role', 'assistance')}. I'd be happy to help, but my current model ({agent.model_name}) is not yet supported in this chat interface."
                
            except Exception as e:
                # Log the error for debugging
                logger.error(f"Error generating AI response for agent {agent_doc['name']}: {e}")
                
                # Fallback response if AI call fails
                if "token" in str(e).lower() or "limit" in str(e).lower():
                    ai_response_content = f"I'm {agent_doc['name']}, your {agent_doc.get('ai_role', 'AI assistant')}. Your message is quite comprehensive! To provide you with the most helpful response, could you please break it down into smaller, more specific questions? This will help me give you more focused and actionable insights."
                else:
                    ai_response_content = f"I'm {agent_doc['name']}, your {agent_doc.get('ai_role', 'AI assistant')}. I'm currently experiencing technical difficulties, but I'm here to help with your query about: {message_data.content[:100]}..."
            
            # Create AI message
            ai_message = MessageCreate(
                workspace_id=workspace_id,
                author=agent_doc["name"],
                type="ai",
                content=ai_response_content,
                created_at=datetime.utcnow(),
                added_to_map=False
            )
            
            # Insert AI message
            ai_result = await database.messages.insert_one(ai_message.model_dump())
            ai_message_doc = await database.messages.find_one({"_id": ai_result.inserted_id})
            # Convert ObjectId to string for Pydantic validation
            ai_message_doc["_id"] = str(ai_message_doc["_id"])
            ai_message_doc["workspace_id"] = str(ai_message_doc["workspace_id"])
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
    # Enhanced debug logging
    print(f"=== NEW ADD TO MAP API CALLED ===")
    print(f"Workspace ID: {workspace_id}")
    print(f"Message ID: {message_id}")
    print(f"Request data: {request_data}")
    print(f"Current user: {current_user.name} ({current_user.id})")
    
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
        "owner_id": current_user.id
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # NEW APPROACH: Use findOneAndUpdate with detailed debugging
    try:
        print(f"=== DETAILED DEBUGGING ===")
        print(f"Looking for message with ObjectId: {ObjectId(message_id)}")
        print(f"In workspace with ObjectId: {ObjectId(workspace_id)}")
        
        # Check if the specific message exists first
        target_message = await database.messages.find_one({
            "_id": ObjectId(message_id)
        })
        
        if target_message:
            print(f"Target message found:")
            print(f"  - ID: {target_message['_id']}")
            print(f"  - Workspace ID: {target_message.get('workspace_id')} (type: {type(target_message.get('workspace_id'))})")
            print(f"  - Expected Workspace ID: {ObjectId(workspace_id)} (type: {type(ObjectId(workspace_id))})")
            print(f"  - Workspace IDs match: {target_message.get('workspace_id') == ObjectId(workspace_id)}")
            print(f"  - Type: {target_message.get('type')}")
            print(f"  - Author: {target_message.get('author')}")
            print(f"  - Added to map: {target_message.get('added_to_map', False)}")
            print(f"  - Content: {target_message.get('content', '')[:50]}...")
        else:
            print(f"Target message with ID {message_id} NOT FOUND in database")
        
        # Now let's see if the message exists in the workspace query
        all_messages_in_workspace = await database.messages.find({
            "workspace_id": ObjectId(workspace_id)
        }).to_list(length=10)
        
        print(f"Found {len(all_messages_in_workspace)} messages in workspace:")
        for msg in all_messages_in_workspace:
            print(f"  - ID: {msg['_id']}, Type: {msg.get('type')}, Author: {msg.get('author')}, Added to map: {msg.get('added_to_map', False)}")
        
        # Now try the atomic update - handle both string and ObjectId workspace_id formats
        message_doc = await database.messages.find_one_and_update(
            {
                "_id": ObjectId(message_id),
                "$or": [
                    {"workspace_id": ObjectId(workspace_id)},  # ObjectId format
                    {"workspace_id": workspace_id}  # String format
                ],
                "added_to_map": {"$ne": True}  # Only if not already added to map
            },
            {
                "$set": {"added_to_map": True}
            },
            return_document=True  # Return the updated document
        )
        
        if not message_doc:
            print("find_one_and_update returned None")
            
            # Check if message exists but is already added to map - handle both formats
            existing_message = await database.messages.find_one({
                "_id": ObjectId(message_id),
                "$or": [
                    {"workspace_id": ObjectId(workspace_id)},  # ObjectId format
                    {"workspace_id": workspace_id}  # String format
                ]
            })
            
            if existing_message:
                print(f"Message exists but update failed. Current added_to_map status: {existing_message.get('added_to_map', False)}")
                if existing_message.get("added_to_map", False):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Message has already been added to map"
                    )
                else:
                    # Message exists but update failed for some reason
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail="Failed to update message status"
                    )
            else:
                # Message doesn't exist
                print("Message doesn't exist in database")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Message not found"
                )
        
        print(f"Message found and updated successfully: {message_doc.get('content', '')[:50]}...")
        
        # Calculate optimal position for the new node to avoid overlapping
        x_position, y_position = await calculate_optimal_node_position(database, workspace_id)
        
        print(f"Creating node at optimal position: x={x_position}, y={y_position}")
        
        # Create node from message
        now = datetime.utcnow()
        node_title = request_data.node_title or f"From Chat: {message_doc['content'][:50]}..."
        node_type = request_data.node_type or ("ai" if message_doc["type"] == "ai" else "human")
        
        node_create = NodeCreate(
            workspace_id=workspace_id,
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
        
        print(f"Successfully created node with ID: {node_id}")
        
        return AddToMapResponse(
            success=True,
            node_id=node_id,
            message="Message successfully converted to map node"
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"Unexpected error in add_message_to_map: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while adding message to map"
        )