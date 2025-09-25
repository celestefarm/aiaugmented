from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from models.node import (
    NodeCreateRequest,
    NodeUpdateRequest,
    NodeResponse,
    NodeListResponse,
    NodeInDB,
    NodeCreate
)
from models.user import UserResponse
from utils.dependencies import get_current_active_user
from utils.summarization import summarize_node_title, summarize_conversation
from database_memory import get_database
from datetime import datetime
from bson import ObjectId
from typing import List, Optional

router = APIRouter(tags=["Nodes"])


# Request/Response models for summarization
class SummarizeRequest(BaseModel):
    """Request model for node title summarization"""
    context: str = Field(default="default", description="Context for summarization (card, tooltip, list, default)")
    max_length: Optional[int] = Field(None, description="Maximum length override")


class SummarizeResponse(BaseModel):
    """Response model for node title summarization"""
    node_id: str = Field(..., description="Node ID")
    original_title: str = Field(..., description="Original node title")
    summarized_title: str = Field(..., description="Generated summarized title")
    method_used: str = Field(..., description="Summarization method used (local or fallback)")
    confidence: Optional[int] = Field(None, description="Confidence score (0-100)")


class ConversationSummarizeRequest(BaseModel):
    """Request model for conversation summarization"""
    conversation_text: str = Field(..., min_length=1, description="Full conversation text to summarize")


class ConversationSummarizeResponse(BaseModel):
    """Response model for conversation summarization"""
    node_id: str = Field(..., description="Node ID")
    key_message: str = Field(..., description="Concise 2-line summary of conversation")
    keynote_points: List[str] = Field(..., description="3-5 bullet points highlighting key points")
    confidence: int = Field(..., description="Confidence score (0-100)")
    method_used: str = Field(..., description="Summarization method used")


async def verify_workspace_access(workspace_id: str, current_user: UserResponse) -> None:
    """
    Verify that the current user has access to the specified workspace.
    
    Args:
        workspace_id: Workspace ID to verify
        current_user: Current authenticated user
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    database = get_database()
    
    print(f"🔍 [WORKSPACE ACCESS] Verifying access for workspace: {workspace_id}")
    print(f"🔍 [WORKSPACE ACCESS] Current user ID: {current_user.id} (type: {type(current_user.id)})")
    
    # First, check if workspace exists at all
    workspace_any = await database.workspaces.find_one({"_id": ObjectId(workspace_id)})
    if workspace_any:
        print(f"🔍 [WORKSPACE ACCESS] Workspace found with owner_id: {workspace_any.get('owner_id')} (type: {type(workspace_any.get('owner_id'))})")
        print(f"🔍 [WORKSPACE ACCESS] Direct comparison: {workspace_any.get('owner_id') == current_user.id}")
    else:
        print(f"🔍 [WORKSPACE ACCESS] ❌ Workspace {workspace_id} does not exist at all")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    # CRITICAL FIX: Simplified workspace access check
    # The logs show user IDs match but the complex $or query is failing
    workspace = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": current_user.id  # Direct string match - this is how owner_id is stored
    })
    
    if not workspace:
        print(f"🔍 [WORKSPACE ACCESS] ❌ Access denied - user {current_user.id} is not owner of workspace {workspace_id}")
        print(f"🔍 [WORKSPACE ACCESS] ❌ Actual owner: {workspace_any.get('owner_id')}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )
    
    print(f"🔍 [WORKSPACE ACCESS] ✅ Access granted for user {current_user.id} to workspace {workspace_id}")


@router.get("/workspaces/{workspace_id}/nodes", response_model=NodeListResponse)
async def get_nodes(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get all nodes for a workspace.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
    Returns:
        List of nodes in the workspace
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Get database instance
    database = get_database()
    
    # Find all nodes in the workspace - use string format since that's how we store workspace_id
    cursor = database.nodes.find({"workspace_id": workspace_id})
    node_docs = await cursor.to_list(length=None)
    
    print(f"=== NODES API DEBUG ===")
    print(f"Workspace ID: {workspace_id}")
    print(f"Found {len(node_docs)} nodes")
    for doc in node_docs:
        print(f"  - Node ID: {doc['_id']}, workspace_id: {doc['workspace_id']} (type: {type(doc['workspace_id'])})")
    
    # Convert to response models
    nodes = []
    for doc in node_docs:
        # Convert ObjectId to string for serialization
        doc['_id'] = str(doc['_id'])
        if isinstance(doc.get('workspace_id'), ObjectId):
            doc['workspace_id'] = str(doc['workspace_id'])
        
        node_in_db = NodeInDB(**doc)
        nodes.append(node_in_db.to_response())
    
    return NodeListResponse(
        nodes=nodes,
        total=len(nodes)
    )


@router.post("/workspaces/{workspace_id}/nodes", response_model=NodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    workspace_id: str,
    node_data: NodeCreateRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Create a new node in a workspace.
    
    Args:
        workspace_id: Workspace ID
        node_data: Node creation data
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Created node data
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Get database instance
    database = get_database()
    
    # Create node document
    now = datetime.utcnow()
    node_create = NodeCreate(
        workspace_id=workspace_id,
        title=node_data.title,
        description=node_data.description,
        type=node_data.type,
        x=node_data.x,
        y=node_data.y,
        confidence=node_data.confidence,
        feasibility=node_data.feasibility,
        source_agent=node_data.source_agent,
        created_at=now,
        updated_at=now
    )
    
    # Insert node into database
    result = await database.nodes.insert_one(node_create.model_dump())
    node_id = result.inserted_id
    
    # Get the created node
    node_doc = await database.nodes.find_one({"_id": node_id})
    # Convert ObjectId fields to strings for Pydantic validation
    node_doc['_id'] = str(node_doc['_id'])
    if isinstance(node_doc.get('workspace_id'), ObjectId):
        node_doc['workspace_id'] = str(node_doc['workspace_id'])
    node_in_db = NodeInDB(**node_doc)
    
    return node_in_db.to_response()


@router.put("/workspaces/{workspace_id}/nodes/{node_id}", response_model=NodeResponse)
async def update_node(
    workspace_id: str,
    node_id: str,
    node_data: NodeUpdateRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Update a node's properties.
    
    Args:
        workspace_id: Workspace ID
        node_id: Node ID
        node_data: Node update data
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Updated node data
        
    Raises:
        HTTPException: If node not found, workspace access denied, or update fails
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Validate node ID format
    if not ObjectId.is_valid(node_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid node ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Check if node exists in the workspace - use string format since that's how we store workspace_id
    existing_node = await database.nodes.find_one({
        "_id": ObjectId(node_id),
        "workspace_id": workspace_id
    })
    
    if not existing_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in workspace"
        )
    
    # Build update fields
    update_fields = {"updated_at": datetime.utcnow()}
    
    if node_data.title is not None:
        update_fields["title"] = node_data.title
    
    if node_data.description is not None:
        update_fields["description"] = node_data.description
    
    if node_data.type is not None:
        update_fields["type"] = node_data.type
    
    if node_data.x is not None:
        update_fields["x"] = node_data.x
    
    if node_data.y is not None:
        update_fields["y"] = node_data.y
    
    if node_data.confidence is not None:
        update_fields["confidence"] = node_data.confidence
    
    if node_data.feasibility is not None:
        update_fields["feasibility"] = node_data.feasibility
    
    if node_data.source_agent is not None:
        update_fields["source_agent"] = node_data.source_agent
    
    # Update node in database
    result = await database.nodes.update_one(
        {"_id": ObjectId(node_id)},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update node"
        )
    
    # Get updated node data
    node_doc = await database.nodes.find_one({"_id": ObjectId(node_id)})
    
    # Convert ObjectId fields to strings for Pydantic validation (CRITICAL FIX)
    node_doc['_id'] = str(node_doc['_id'])
    if isinstance(node_doc.get('workspace_id'), ObjectId):
        node_doc['workspace_id'] = str(node_doc['workspace_id'])
    
    node_in_db = NodeInDB(**node_doc)
    
    return node_in_db.to_response()


@router.delete("/workspaces/{workspace_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    workspace_id: str,
    node_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete a node and its connected edges, and reset the corresponding message's added_to_map status.
    
    Args:
        workspace_id: Workspace ID
        node_id: Node ID
        current_user: Current authenticated user (from dependency)
        
    Raises:
        HTTPException: If node not found or workspace access denied
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Validate node ID format
    if not ObjectId.is_valid(node_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid node ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Check if node exists in the workspace - use string format since that's how we store workspace_id
    existing_node = await database.nodes.find_one({
        "_id": ObjectId(node_id),
        "workspace_id": workspace_id
    })
    
    if not existing_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in workspace"
        )
    
    # Find and reset the corresponding message's added_to_map status
    # Look for a message that was created from this node by matching content/title
    node_title = existing_node.get("title", "")
    node_description = existing_node.get("description", "")
    
    # Try to find the message that created this node
    # We'll look for messages with similar content and added_to_map=True
    if node_title or node_description:
        search_text = node_title or node_description
        # Get first few words to match against message content
        search_words = search_text.lower().split()[:5]  # First 5 words
        
        # Find messages in the workspace that might have created this node
        messages_cursor = database.messages.find({
            "workspace_id": workspace_id,
            "added_to_map": True,
            "type": "ai"  # Only AI messages can be added to map
        })
        
        # Convert cursor to list for in-memory database compatibility
        messages_docs = []
        if hasattr(messages_cursor, 'to_list'):
            messages_docs = await messages_cursor.to_list(length=None)
        else:
            try:
                async for msg_doc in messages_cursor:
                    messages_docs.append(msg_doc)
            except TypeError:
                for msg_doc in messages_cursor:
                    messages_docs.append(msg_doc)
        
        # Find the most likely message that created this node
        best_match = None
        best_score = 0
        
        for msg_doc in messages_docs:
            msg_content = msg_doc.get("content", "").lower()
            
            # Calculate similarity score based on word overlap
            msg_words = msg_content.split()[:10]  # First 10 words of message
            overlap = len(set(search_words) & set(msg_words))
            score = overlap / max(len(search_words), 1)
            
            if score > best_score and score > 0.3:  # At least 30% word overlap
                best_score = score
                best_match = msg_doc
        
        # Reset the message's added_to_map status
        if best_match:
            await database.messages.update_one(
                {"_id": best_match["_id"]},
                {"$set": {"added_to_map": False, "updated_at": datetime.utcnow()}}
            )
            print(f"=== NODE DELETION DEBUG ===")
            print(f"Reset message {best_match['_id']} added_to_map status to False")
            print(f"Match score: {best_score:.2f}")
    
    # Delete all edges connected to this node (cascade deletion)
    # CONSISTENCY FIX: Use string workspace_id to match how nodes are stored
    await database.edges.delete_many({
        "workspace_id": workspace_id,  # Use string format consistently
        "$or": [
            {"from_node_id": ObjectId(node_id)},
            {"to_node_id": ObjectId(node_id)}
        ]
    })
    
    # Delete the node - use string format since that's how we store workspace_id
    result = await database.nodes.delete_one({
        "_id": ObjectId(node_id),
        "workspace_id": workspace_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in workspace"
        )
    
    return None


@router.delete("/workspaces/{workspace_id}/nodes", status_code=status.HTTP_200_OK)
async def clear_all_nodes(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Clear all nodes and edges from a workspace.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Success message with count of deleted items
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Get database instance
    database = get_database()
    
    # Count nodes before deletion - use string format since that's how we store workspace_id
    node_count = await database.nodes.count_documents({"workspace_id": workspace_id})
    
    # Count edges before deletion - use string format since that's how we store workspace_id
    edge_count = await database.edges.count_documents({"workspace_id": workspace_id})
    
    # Delete all edges in the workspace first
    # CONSISTENCY FIX: Use string workspace_id consistently
    await database.edges.delete_many({"workspace_id": workspace_id})
    
    # Delete all nodes in the workspace
    await database.nodes.delete_many({"workspace_id": workspace_id})
    
    print(f"=== CLEAR NODES DEBUG ===")
    print(f"Workspace ID: {workspace_id}")
    print(f"Deleted {node_count} nodes and {edge_count} edges")
    
    return {
        "message": f"Successfully cleared workspace",
        "deleted_nodes": node_count,
        "deleted_edges": edge_count
    }


@router.post("/workspaces/{workspace_id}/nodes/auto-arrange", status_code=status.HTTP_200_OK)
async def auto_arrange_nodes(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Auto-arrange all nodes in a workspace to prevent overlapping.
    Uses a grid layout for clean organization.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Success message
        
    Raises:
        HTTPException: If workspace not found or access denied
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Get database instance
    database = get_database()
    
    # Get all nodes in the workspace - use string format since that's how we store workspace_id
    cursor = database.nodes.find({"workspace_id": workspace_id})
    node_docs = await cursor.to_list(length=None)
    
    if not node_docs:
        return {"message": "No nodes to arrange"}
    
    # Canvas and node dimensions
    CANVAS_WIDTH = 1200
    CANVAS_HEIGHT = 800
    NODE_WIDTH = 280
    NODE_HEIGHT = 200
    SPACING = 50
    
    # Calculate grid dimensions
    cols = max(1, int((CANVAS_WIDTH - SPACING) / (NODE_WIDTH + SPACING)))
    rows = max(1, int((CANVAS_HEIGHT - SPACING) / (NODE_HEIGHT + SPACING)))
    
    # Starting position (with margin)
    start_x = SPACING + NODE_WIDTH / 2
    start_y = SPACING + NODE_HEIGHT / 2
    
    print(f"=== AUTO-ARRANGE DEBUG ===")
    print(f"Arranging {len(node_docs)} nodes in {cols}x{rows} grid")
    print(f"Canvas: {CANVAS_WIDTH}x{CANVAS_HEIGHT}, Node: {NODE_WIDTH}x{NODE_HEIGHT}")
    
    # Arrange nodes in grid pattern
    updates = []
    for i, node_doc in enumerate(node_docs):
        row = i // cols
        col = i % cols
        
        # Calculate position
        x = start_x + col * (NODE_WIDTH + SPACING)
        y = start_y + row * (NODE_HEIGHT + SPACING)
        
        # Ensure we don't go outside canvas bounds
        if x > CANVAS_WIDTH - NODE_WIDTH / 2:
            x = CANVAS_WIDTH - NODE_WIDTH / 2
        if y > CANVAS_HEIGHT - NODE_HEIGHT / 2:
            y = CANVAS_HEIGHT - NODE_HEIGHT / 2
        
        print(f"  Node {i+1}: ({x}, {y})")
        
        # Prepare update
        updates.append({
            "filter": {"_id": node_doc["_id"]},
            "update": {
                "$set": {
                    "x": x,
                    "y": y,
                    "updated_at": datetime.utcnow()
                }
            }
        })
    
    # Perform bulk update
    if updates:
        for update in updates:
            await database.nodes.update_one(
                update["filter"],
                update["update"]
            )
    
    print(f"Successfully arranged {len(updates)} nodes")
    
    return {
        "message": f"Successfully arranged {len(node_docs)} nodes",
        "arranged_count": len(node_docs)
    }


@router.post("/nodes/{node_id}/summarize", response_model=SummarizeResponse)
async def summarize_node_title_endpoint(
    node_id: str,
    request: SummarizeRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Generate a summarized title for a node using local NLP algorithms.
    
    This endpoint uses intelligent NLP techniques including keyword extraction,
    sentence ranking, and pattern matching to create meaningful summaries
    that are better than simple truncation.
    
    Args:
        node_id: Node ID to summarize
        request: Summarization request with context and max_length
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Summarization result with original title, summarized title, and metadata
        
    Raises:
        HTTPException: If node not found or access denied
    """
    # Validate node ID format
    if not ObjectId.is_valid(node_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid node ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Find the node and verify user has access to it
    node_doc = await database.nodes.find_one({"_id": ObjectId(node_id)})
    
    if not node_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Verify user has access to the workspace containing this node
    workspace_id = str(node_doc.get("workspace_id"))
    try:
        await verify_workspace_access(workspace_id, current_user)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found or access denied"
        )
    
    # Get the original title
    original_title = node_doc.get("title", "")
    
    if not original_title:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Node has no title to summarize"
        )
    
    # Generate the summarized title using our NLP service
    try:
        summary_result = summarize_node_title(
            full_text=original_title,
            context=request.context,
            max_length=request.max_length
        )
        
        summarized_title = summary_result.get("summarized_title", "")
        method_used = summary_result.get("method_used", "fallback")
        confidence = summary_result.get("confidence", 0)
        
    except Exception as e:
        # Fallback to simple truncation if NLP fails
        max_len = request.max_length or 35
        if len(original_title) <= max_len:
            summarized_title = original_title
        else:
            summarized_title = original_title[:max_len-3] + "..."
        method_used = "fallback"
        confidence = 50
    
    # Store the summarized title in the node's summarized_titles field
    context_key = request.context
    update_data = {
        f"summarized_titles.{context_key}": summarized_title,
        "updated_at": datetime.utcnow()
    }
    
    try:
        await database.nodes.update_one(
            {"_id": ObjectId(node_id)},
            {"$set": update_data}
        )
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Warning: Failed to store summarized title in database: {e}")
    
    # Return the response
    return SummarizeResponse(
        node_id=node_id,
        original_title=original_title,
        summarized_title=summarized_title,
        method_used=method_used,
        confidence=confidence
    )


@router.post("/nodes/{node_id}/summarize-conversation", response_model=ConversationSummarizeResponse)
async def summarize_conversation_endpoint(
    node_id: str,
    request: ConversationSummarizeRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Generate conversation summary with key message and keynote points for a node.
    
    This endpoint analyzes conversation text and generates:
    - Key Message: A concise 2-line summary capturing the main takeaway
    - Keynote Points: 3-5 bullet points highlighting important discussion points
    
    Args:
        node_id: Node ID to store the summary for
        request: Conversation summarization request with conversation text
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Conversation summary with key message, keynote points, and metadata
        
    Raises:
        HTTPException: If node not found or access denied
    """
    # Validate node ID format
    if not ObjectId.is_valid(node_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid node ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Find the node and verify user has access to it
    node_doc = await database.nodes.find_one({"_id": ObjectId(node_id)})
    
    if not node_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found"
        )
    
    # Verify user has access to the workspace containing this node
    workspace_id = str(node_doc.get("workspace_id"))
    try:
        await verify_workspace_access(workspace_id, current_user)
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found or access denied"
        )
    
    # Generate the conversation summary using our NLP service
    try:
        summary_result = summarize_conversation(request.conversation_text)
        
        key_message = summary_result.get("key_message", "")
        keynote_points = summary_result.get("keynote_points", [])
        confidence = summary_result.get("confidence", 0)
        method_used = summary_result.get("method_used", "fallback")
        
    except Exception as e:
        # Fallback to simple extraction if NLP fails
        key_message = "More context needed for tailored strategy."
        keynote_points = [
            "Lacks specific details on market scope",
            "Cannot propose targeted strategies without context"
        ]
        confidence = 30
        method_used = "fallback"
    
    # Store the conversation summary in the node
    update_data = {
        "key_message": key_message,
        "keynote_points": keynote_points,
        "updated_at": datetime.utcnow()
    }
    
    try:
        await database.nodes.update_one(
            {"_id": ObjectId(node_id)},
            {"$set": update_data}
        )
    except Exception as e:
        # Log the error but don't fail the request
        print(f"Warning: Failed to store conversation summary in database: {e}")
    
    # Return the response
    return ConversationSummarizeResponse(
        node_id=node_id,
        key_message=key_message,
        keynote_points=keynote_points,
        confidence=confidence,
        method_used=method_used
    )