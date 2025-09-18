from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from models.user import PyObjectId


# Request/Response Models
class AgentCreateRequest(BaseModel):
    """Agent creation request model for custom agents"""
    name: str = Field(..., min_length=1, max_length=100, description="Agent display name")
    ai_role: str = Field(..., min_length=1, max_length=500, description="AI capabilities description")
    human_role: str = Field(..., min_length=1, max_length=500, description="Human collaboration description")
    full_description: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Detailed agent information")


class AgentResponse(BaseModel):
    """Agent response model"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    agent_id: str
    name: str
    ai_role: str
    human_role: str
    is_custom: bool
    is_active: bool
    full_description: Dict[str, Any] = Field(default_factory=dict)


class AgentListResponse(BaseModel):
    """Agent list response model"""
    agents: list[AgentResponse]
    total: int


# Database Models
class AgentInDB(BaseModel):
    """Agent model for database operations"""
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
        json_encoders={ObjectId: str}
    )
    
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    agent_id: str
    name: str
    ai_role: str
    human_role: str
    is_custom: bool
    is_active: bool
    full_description: Dict[str, Any] = Field(default_factory=dict)

    def to_response(self) -> AgentResponse:
        """Convert to response model"""
        return AgentResponse(
            id=self.id,
            agent_id=self.agent_id,
            name=self.name,
            ai_role=self.ai_role,
            human_role=self.human_role,
            is_custom=self.is_custom,
            is_active=self.is_active,
            full_description=self.full_description
        )


class AgentCreate(BaseModel):
    """Agent creation model for internal use"""
    agent_id: str
    name: str
    ai_role: str
    human_role: str
    is_custom: bool
    is_active: bool
    full_description: Dict[str, Any] = Field(default_factory=dict)