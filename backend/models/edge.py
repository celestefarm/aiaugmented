from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


# Request/Response Models
class EdgeCreateRequest(BaseModel):
    """Edge creation request model"""
    from_node_id: str = Field(..., description="Source node ID")
    to_node_id: str = Field(..., description="Target node ID")
    type: str = Field(..., description="Relationship type (support, contradiction, dependency, ai-relationship)")
    description: str = Field(default="", description="Connection description")


class EdgeResponse(BaseModel):
    """Edge response model"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    workspace_id: PyObjectId
    from_node_id: PyObjectId
    to_node_id: PyObjectId
    type: str
    description: str = ""
    created_at: datetime


class EdgeListResponse(BaseModel):
    """Edge list response model"""
    edges: list[EdgeResponse]
    total: int


# Database Models
class EdgeInDB(BaseModel):
    """Edge model for database operations"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    workspace_id: PyObjectId
    from_node_id: PyObjectId
    to_node_id: PyObjectId
    type: str
    description: str = ""
    created_at: datetime

    def to_response(self) -> EdgeResponse:
        """Convert to response model"""
        return EdgeResponse(
            id=self.id,
            workspace_id=self.workspace_id,
            from_node_id=self.from_node_id,
            to_node_id=self.to_node_id,
            type=self.type,
            description=self.description,
            created_at=self.created_at
        )


class EdgeCreate(BaseModel):
    """Edge creation model for internal use"""
    workspace_id: PyObjectId
    from_node_id: PyObjectId
    to_node_id: PyObjectId
    type: str
    description: str = ""
    created_at: datetime