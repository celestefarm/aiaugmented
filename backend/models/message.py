from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


# Request/Response Models
class MessageCreateRequest(BaseModel):
    """Message creation request model"""
    content: str = Field(..., min_length=1, max_length=2000, description="Message content")


class MessageResponse(BaseModel):
    """Message response model"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: str = Field(..., description="Message ID as string")
    workspace_id: str = Field(..., description="Workspace ID as string")
    author: str
    type: str  # "human" or "ai"
    content: str
    created_at: datetime
    added_to_map: bool = False


class MessageListResponse(BaseModel):
    """Message list response model"""
    messages: list[MessageResponse]
    total: int


class AddToMapRequest(BaseModel):
    """Request model for adding message to map"""
    node_title: Optional[str] = Field(None, description="Optional custom title for the node")
    node_type: Optional[str] = Field(default="ai", description="Node type (ai, human, decision, risk, dependency)")


class AddToMapResponse(BaseModel):
    """Response model for add to map operation"""
    success: bool
    node_id: Optional[str] = None
    message: str


class RemoveFromMapRequest(BaseModel):
    """Request model for removing node from map"""
    node_id: str = Field(..., description="Node ID to remove from map")


class RemoveFromMapResponse(BaseModel):
    """Response model for remove from map operation"""
    success: bool
    message_id: Optional[str] = None
    message: str


# Database Models
class MessageInDB(BaseModel):
    """Message model for database operations"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    workspace_id: PyObjectId
    author: str
    type: str  # "human" or "ai"
    content: str
    created_at: datetime
    added_to_map: bool = False

    def to_response(self) -> MessageResponse:
        """Convert to response model"""
        # Ensure ID is always a valid string - should never be None if properly created
        if not self.id:
            raise ValueError("Message ID cannot be None when converting to response")
        if not self.workspace_id:
            raise ValueError("Workspace ID cannot be None when converting to response")
            
        return MessageResponse(
            id=str(self.id),
            workspace_id=str(self.workspace_id),
            author=self.author,
            type=self.type,
            content=self.content,
            created_at=self.created_at,
            added_to_map=self.added_to_map
        )


class MessageCreate(BaseModel):
    """Message creation model for internal use"""
    workspace_id: PyObjectId
    author: str
    type: str
    content: str
    created_at: datetime
    added_to_map: bool = False