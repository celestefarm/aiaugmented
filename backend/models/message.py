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
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    workspace_id: PyObjectId
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
        return MessageResponse(
            id=self.id,
            workspace_id=self.workspace_id,
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