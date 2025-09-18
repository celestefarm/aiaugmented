from fastapi import APIRouter, HTTPException, status, Depends
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
from database import get_database
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(tags=["Nodes"])


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
    workspace = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": ObjectId(current_user.id)
    })
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found or access denied"
        )


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
    
    # Find all nodes in the workspace
    cursor = database.nodes.find({"workspace_id": ObjectId(workspace_id)})
    node_docs = await cursor.to_list(length=None)
    
    # Convert to response models
    nodes = []
    for doc in node_docs:
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
        workspace_id=ObjectId(workspace_id),
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
    
    # Check if node exists in the workspace
    existing_node = await database.nodes.find_one({
        "_id": ObjectId(node_id),
        "workspace_id": ObjectId(workspace_id)
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
    node_in_db = NodeInDB(**node_doc)
    
    return node_in_db.to_response()


@router.delete("/workspaces/{workspace_id}/nodes/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_node(
    workspace_id: str,
    node_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete a node and its connected edges.
    
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
    
    # Check if node exists in the workspace
    existing_node = await database.nodes.find_one({
        "_id": ObjectId(node_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if not existing_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in workspace"
        )
    
    # Delete all edges connected to this node (cascade deletion)
    await database.edges.delete_many({
        "workspace_id": ObjectId(workspace_id),
        "$or": [
            {"from_node_id": ObjectId(node_id)},
            {"to_node_id": ObjectId(node_id)}
        ]
    })
    
    # Delete the node
    result = await database.nodes.delete_one({
        "_id": ObjectId(node_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Node not found in workspace"
        )
    
    return None