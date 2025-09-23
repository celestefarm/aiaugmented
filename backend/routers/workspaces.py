from fastapi import APIRouter, HTTPException, status, Depends
from models.workspace import (
    WorkspaceCreateRequest, 
    WorkspaceUpdateRequest, 
    WorkspaceResponse, 
    WorkspaceListResponse,
    WorkspaceInDB, 
    WorkspaceCreate
)
from models.user import UserResponse
from utils.dependencies import get_current_active_user
from database_memory import get_database
from datetime import datetime
from bson import ObjectId
from typing import List

router = APIRouter(tags=["Workspaces"])


@router.get("/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces(current_user: UserResponse = Depends(get_current_active_user)):
    """
    List all workspaces for the authenticated user.
    
    Args:
        current_user: Current authenticated user (from dependency)
        
    Returns:
        List of user's workspaces
    """
    # Get database instance
    database = get_database()
    
    # Find all workspaces owned by the current user, sorted by creation date (newest first)
    workspace_docs = await database.workspaces.find({"owner_id": current_user.id})
    
    # Sort by created_at in descending order (newest first)
    workspace_docs.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    # Convert to response models
    workspaces = []
    for doc in workspace_docs:
        # Convert ObjectId to string for Pydantic compatibility
        if doc and "_id" in doc:
            doc["_id"] = str(doc["_id"])
        workspace_in_db = WorkspaceInDB(**doc)
        workspaces.append(workspace_in_db.to_response())
    
    return WorkspaceListResponse(
        workspaces=workspaces,
        total=len(workspaces)
    )


@router.post("/workspaces", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreateRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Create a new workspace for the authenticated user.
    
    Args:
        workspace_data: Workspace creation data
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Created workspace data
    """
    # Get database instance
    database = get_database()
    
    # Create workspace document
    now = datetime.utcnow()
    workspace_create = WorkspaceCreate(
        title=workspace_data.title,
        owner_id=current_user.id,  # Keep as string (PyObjectId)
        created_at=now,
        updated_at=now,
        settings=workspace_data.settings or {},
        transform=workspace_data.transform or {"x": 0, "y": 0, "scale": 1}
    )
    
    # Insert workspace into database
    result = await database.workspaces.insert_one(workspace_create.model_dump())
    workspace_id = result.inserted_id
    
    # Get the created workspace
    workspace_doc = await database.workspaces.find_one({"_id": workspace_id})
    
    # Convert ObjectId to string for Pydantic compatibility
    if workspace_doc and "_id" in workspace_doc:
        workspace_doc["_id"] = str(workspace_doc["_id"])
    
    workspace_in_db = WorkspaceInDB(**workspace_doc)
    
    return workspace_in_db.to_response()


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Retrieve a specific workspace by ID.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Workspace data
        
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
    
    # Find workspace by ID and owner
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": current_user.id
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Convert ObjectId to string for Pydantic compatibility
    if workspace_doc and "_id" in workspace_doc:
        workspace_doc["_id"] = str(workspace_doc["_id"])
    
    workspace_in_db = WorkspaceInDB(**workspace_doc)
    return workspace_in_db.to_response()


@router.put("/workspaces/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    workspace_data: WorkspaceUpdateRequest,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Update a workspace's details.
    
    Args:
        workspace_id: Workspace ID
        workspace_data: Workspace update data
        current_user: Current authenticated user (from dependency)
        
    Returns:
        Updated workspace data
        
    Raises:
        HTTPException: If workspace not found, access denied, or update fails
    """
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Check if workspace exists and user owns it
    existing_workspace = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": current_user.id
    })
    
    if not existing_workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Build update fields
    update_fields = {"updated_at": datetime.utcnow()}
    
    if workspace_data.title is not None:
        update_fields["title"] = workspace_data.title
    
    if workspace_data.settings is not None:
        update_fields["settings"] = workspace_data.settings
    
    if workspace_data.transform is not None:
        update_fields["transform"] = workspace_data.transform
    
    # Update workspace in database
    result = await database.workspaces.update_one(
        {"_id": ObjectId(workspace_id)},
        {"$set": update_fields}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update workspace"
        )
    
    # Get updated workspace data
    workspace_doc = await database.workspaces.find_one({"_id": ObjectId(workspace_id)})
    
    # Convert ObjectId to string for Pydantic compatibility
    if workspace_doc and "_id" in workspace_doc:
        workspace_doc["_id"] = str(workspace_doc["_id"])
    
    workspace_in_db = WorkspaceInDB(**workspace_doc)
    
    return workspace_in_db.to_response()


@router.delete("/workspaces/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete a workspace.
    
    Args:
        workspace_id: Workspace ID
        current_user: Current authenticated user (from dependency)
        
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
    
    # Delete workspace (only if owned by current user)
    result = await database.workspaces.delete_one({
        "_id": ObjectId(workspace_id),
        "owner_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Note: In a production system, you might want to:
    # 1. Also delete related nodes, edges, messages, etc.
    # 2. Implement soft deletes for audit trail
    # 3. Add confirmation step for destructive operations
    
    return None