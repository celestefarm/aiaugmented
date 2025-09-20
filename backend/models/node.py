from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, List
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


# Request/Response Models
class NodeCreateRequest(BaseModel):
    """Node creation request model"""
    title: str = Field(..., min_length=1, max_length=200, description="Node title")
    description: str = Field(default="", description="Node description/content")
    type: str = Field(..., description="Node type (human, ai, decision, risk, dependency)")
    x: float = Field(..., description="Canvas X position")
    y: float = Field(..., description="Canvas Y position")
    confidence: Optional[int] = Field(None, ge=0, le=100, description="Confidence percentage (0-100)")
    feasibility: Optional[str] = Field(None, description="Feasibility rating (low, medium, high)")
    source_agent: Optional[str] = Field(None, description="Creating agent ID")


class NodeUpdateRequest(BaseModel):
    """Node update request model"""
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Node title")
    description: Optional[str] = Field(None, description="Node description/content")
    type: Optional[str] = Field(None, description="Node type (human, ai, decision, risk, dependency)")
    x: Optional[float] = Field(None, description="Canvas X position")
    y: Optional[float] = Field(None, description="Canvas Y position")
    confidence: Optional[int] = Field(None, ge=0, le=100, description="Confidence percentage (0-100)")
    feasibility: Optional[str] = Field(None, description="Feasibility rating (low, medium, high)")
    source_agent: Optional[str] = Field(None, description="Creating agent ID")


class NodeResponse(BaseModel):
    """Node response model"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str},
        # CRITICAL FIX: Ensure serialization uses field names, not aliases
        by_alias=False
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id", serialization_alias="id")
    workspace_id: PyObjectId
    title: str
    description: str = ""
    type: str
    x: float
    y: float
    confidence: Optional[int] = None
    feasibility: Optional[str] = None
    source_agent: Optional[str] = None
    summarized_titles: Optional[Dict[str, str]] = Field(default_factory=dict, description="Context-specific summarized titles")
    key_message: Optional[str] = Field(None, description="Concise 2-line summary of conversation content")
    keynote_points: Optional[List[str]] = Field(default_factory=list, description="3-5 bullet points highlighting key discussion points")
    created_at: datetime
    updated_at: datetime


class NodeListResponse(BaseModel):
    """Node list response model"""
    nodes: list[NodeResponse]
    total: int


# Database Models
class NodeInDB(BaseModel):
    """Node model for database operations"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    workspace_id: PyObjectId
    title: str
    description: str = ""
    type: str
    x: float
    y: float
    confidence: Optional[int] = None
    feasibility: Optional[str] = None
    source_agent: Optional[str] = None
    summarized_titles: Optional[Dict[str, str]] = Field(default_factory=dict, description="Context-specific summarized titles")
    key_message: Optional[str] = Field(None, description="Concise 2-line summary of conversation content")
    keynote_points: Optional[List[str]] = Field(default_factory=list, description="3-5 bullet points highlighting key discussion points")
    created_at: datetime
    updated_at: datetime

    def to_response(self) -> NodeResponse:
        """Convert to response model"""
        # CRITICAL FIX: Explicitly pass _id as id to ensure proper serialization
        return NodeResponse(
            _id=self.id,  # Pass as _id so it gets aliased correctly
            workspace_id=self.workspace_id,
            title=self.title,
            description=self.description,
            type=self.type,
            x=self.x,
            y=self.y,
            confidence=self.confidence,
            feasibility=self.feasibility,
            source_agent=self.source_agent,
            summarized_titles=self.summarized_titles or {},
            key_message=self.key_message,
            keynote_points=self.keynote_points or [],
            created_at=self.created_at,
            updated_at=self.updated_at
        )


class NodeCreate(BaseModel):
    """Node creation model for internal use"""
    workspace_id: PyObjectId
    title: str
    description: str = ""
    type: str
    x: float
    y: float
    confidence: Optional[int] = None
    feasibility: Optional[str] = None
    source_agent: Optional[str] = None
    summarized_titles: Optional[Dict[str, str]] = Field(default_factory=dict, description="Context-specific summarized titles")
    key_message: Optional[str] = Field(None, description="Concise 2-line summary of conversation content")
    keynote_points: Optional[List[str]] = Field(default_factory=list, description="3-5 bullet points highlighting key discussion points")
    created_at: datetime
    updated_at: datetime