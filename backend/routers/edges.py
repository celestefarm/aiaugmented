from fastapi import APIRouter, HTTPException, status, Depends
from models.edge import (
    EdgeCreateRequest,
    EdgeResponse,
    EdgeListResponse,
    EdgeInDB,
    EdgeCreate
)
from models.user import UserResponse
from utils.dependencies import get_current_active_user
from database import get_database
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(tags=["Edges"])


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


async def verify_nodes_exist_in_workspace(workspace_id: str, from_node_id: str, to_node_id: str) -> None:
    """
    Verify that both nodes exist in the specified workspace.
    
    Args:
        workspace_id: Workspace ID
        from_node_id: Source node ID
        to_node_id: Target node ID
        
    Raises:
        HTTPException: If either node doesn't exist in the workspace
    """
    if not ObjectId.is_valid(from_node_id) or not ObjectId.is_valid(to_node_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid node ID format"
        )
    
    database = get_database()
    
    # Check if both nodes exist in the workspace
    from_node = await database.nodes.find_one({
        "_id": ObjectId(from_node_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    to_node = await database.nodes.find_one({
        "_id": ObjectId(to_node_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if not from_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source node not found in workspace"
        )
    
    if not to_node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target node not found in workspace"
        )


@router.get("/workspaces/{workspace_id}/edges", response_model=EdgeListResponse)
async def get_edges(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get all edges for a workspace.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
    Returns:
        List of edges in the workspace
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Get database instance
    database = get_database()
    
    # Find all edges in the workspace
    cursor = database.edges.find({"workspace_id": ObjectId(workspace_id)})
    edge_docs = await cursor.to_list(length=None)
    
    # Convert to response models
    edges = []
    for doc in edge_docs:
        edge_in_db = EdgeInDB(**doc)
        edges.append(edge_in_db.to_response())
    
    return EdgeListResponse(
        edges=edges,
        total=len(edges)
    )


@router.post("/workspaces/{workspace_id}/edges", response_model=EdgeResponse, status_code=status.HTTP_201_CREATED)
async def create_edge(
    workspace_id: str,
    edge_data: EdgeCreateRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Create a new edge connecting two nodes.
    
    Args:
        workspace_id: Workspace ID
        edge_data: Edge creation data
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Created edge data
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Verify both nodes exist in the workspace
    await verify_nodes_exist_in_workspace(workspace_id, edge_data.from_node_id, edge_data.to_node_id)
    
    # Get database instance
    database = get_database()
    
    # Check if edge already exists between these nodes
    existing_edge = await database.edges.find_one({
        "workspace_id": ObjectId(workspace_id),
        "from_node_id": ObjectId(edge_data.from_node_id),
        "to_node_id": ObjectId(edge_data.to_node_id),
        "type": edge_data.type
    })
    
    if existing_edge:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Edge with this type already exists between these nodes"
        )
    
    # Create edge document
    now = datetime.utcnow()
    edge_create = EdgeCreate(
        workspace_id=ObjectId(workspace_id),
        from_node_id=ObjectId(edge_data.from_node_id),
        to_node_id=ObjectId(edge_data.to_node_id),
        type=edge_data.type,
        description=edge_data.description,
        created_at=now
    )
    
    # Insert edge into database
    result = await database.edges.insert_one(edge_create.model_dump())
    edge_id = result.inserted_id
    
    # Get the created edge
    edge_doc = await database.edges.find_one({"_id": edge_id})
    edge_in_db = EdgeInDB(**edge_doc)
    
    return edge_in_db.to_response()


@router.delete("/workspaces/{workspace_id}/edges/{edge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_edge(
    workspace_id: str,
    edge_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete an edge.
    
    Args:
        workspace_id: Workspace ID
        edge_id: Edge ID
        current_user: Current authenticated user (from dependency)
        
    Raises:
        HTTPException: If edge not found or workspace access denied
    """
    # Verify workspace access
    await verify_workspace_access(workspace_id, current_user)
    
    # Validate edge ID format
    if not ObjectId.is_valid(edge_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid edge ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Delete the edge (only if it exists in the workspace)
    result = await database.edges.delete_one({
        "_id": ObjectId(edge_id),
        "workspace_id": ObjectId(workspace_id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Edge not found in workspace"
        )
    
    return None