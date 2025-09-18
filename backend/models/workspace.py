from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


# Request/Response Models
class WorkspaceCreateRequest(BaseModel):
    """Workspace creation request model"""
    title: str = Field(..., min_length=1, max_length=200, description="Workspace title")
    settings: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Workspace configuration")
    transform: Optional[Dict[str, float]] = Field(
        default_factory=lambda: {"x": 0, "y": 0, "scale": 1},
        description="Canvas transform state"
    )


class WorkspaceUpdateRequest(BaseModel):
    """Workspace update request model"""
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Workspace title")
    settings: Optional[Dict[str, Any]] = Field(None, description="Workspace configuration")
    transform: Optional[Dict[str, float]] = Field(None, description="Canvas transform state")


class WorkspaceResponse(BaseModel):
    """Workspace response model"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    title: str
    owner_id: PyObjectId
    created_at: datetime
    updated_at: datetime
    settings: Dict[str, Any] = Field(default_factory=dict)
    transform: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0, "scale": 1})


class WorkspaceListResponse(BaseModel):
    """Workspace list response model"""
    workspaces: list[WorkspaceResponse]
    total: int


# Database Models
class WorkspaceInDB(BaseModel):
    """Workspace model for database operations"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    title: str
    owner_id: PyObjectId
    created_at: datetime
    updated_at: datetime
    settings: Dict[str, Any] = Field(default_factory=dict)
    transform: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0, "scale": 1})

    def to_response(self) -> WorkspaceResponse:
        """Convert to response model"""
        return WorkspaceResponse(
            id=self.id,
            title=self.title,
            owner_id=self.owner_id,
            created_at=self.created_at,
            updated_at=self.updated_at,
            settings=self.settings,
            transform=self.transform
        )


class WorkspaceCreate(BaseModel):
    """Workspace creation model for internal use"""
    title: str
    owner_id: PyObjectId
    created_at: datetime
    updated_at: datetime
    settings: Dict[str, Any] = Field(default_factory=dict)
    transform: Dict[str, float] = Field(default_factory=lambda: {"x": 0, "y": 0, "scale": 1})