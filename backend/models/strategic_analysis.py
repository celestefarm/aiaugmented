"""
Strategic Analysis Data Models
Pydantic models for strategic analysis and lightning brief data (MongoDB compatible)
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Dict, List, Any, Optional
from enum import Enum
from bson import ObjectId

class PyObjectId(ObjectId):
    """Custom ObjectId type for Pydantic v2"""
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_after_validator_function(
            cls.validate,
            core_schema.str_schema(),
            serialization=core_schema.to_string_ser_schema(),
        )

    @classmethod
    def validate(cls, v):
        if isinstance(v, ObjectId):
            return str(v)
        if isinstance(v, str):
            if ObjectId.is_valid(v):
                return v
        raise ValueError("Invalid ObjectId")

class AnalysisPhase(str, Enum):
    RECONNAISSANCE = "reconnaissance"
    ANALYSIS = "analysis"
    SYNTHESIS = "synthesis"
    VALIDATION = "validation"
    BRIEFING = "briefing"

class EvidenceQuality(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    SPECULATIVE = "speculative"

class StrategicSessionBase(BaseModel):
    """Base strategic analysis session model"""
    user_id: str
    workspace_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    current_phase: AnalysisPhase = AnalysisPhase.RECONNAISSANCE
    context_data: Dict[str, Any] = Field(default_factory=dict)
    session_state: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class StrategicSession(StrategicSessionBase):
    """Strategic analysis session with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

class StrategicEvidenceBase(BaseModel):
    """Base strategic evidence model"""
    session_id: str
    content: str
    source: str
    evidence_type: Optional[str] = None
    quality: EvidenceQuality = EvidenceQuality.MEDIUM
    confidence_score: float = 0.5
    reliability_score: float = 0.5
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class StrategicEvidence(StrategicEvidenceBase):
    """Strategic evidence with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

class StrategicOptionBase(BaseModel):
    """Base strategic option model"""
    session_id: str
    title: str
    description: str
    rationale: Optional[str] = None
    confidence_score: float = 0.0
    feasibility_score: float = 0.0
    impact_score: float = 0.0
    risk_score: float = 0.0
    risk_factors: List[str] = Field(default_factory=list)
    opportunity_factors: List[str] = Field(default_factory=list)
    success_criteria: List[str] = Field(default_factory=list)
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    is_recommended: bool = False
    is_validated: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class StrategicOption(StrategicOptionBase):
    """Strategic option with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

class LightningBriefBase(BaseModel):
    """Base lightning brief model"""
    session_id: str
    situation_summary: str
    key_insights: List[str] = Field(default_factory=list)
    critical_assumptions: List[str] = Field(default_factory=list)
    next_actions: List[str] = Field(default_factory=list)
    confidence_level: str
    evidence_quality_score: float = 0.0
    strategic_alignment_score: float = 0.0
    brief_type: str = "standard"
    priority_level: str = "medium"
    is_approved: bool = False
    is_implemented: bool = False
    generated_at: datetime = Field(default_factory=datetime.utcnow)
    approved_at: Optional[datetime] = None
    implemented_at: Optional[datetime] = None

class LightningBrief(LightningBriefBase):
    """Lightning brief with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

class RedTeamChallengeBase(BaseModel):
    """Base red team challenge model"""
    session_id: str
    challenge_type: str
    challenge_question: str
    target_assumption: Optional[str] = None
    target_option_id: Optional[str] = None
    user_response: Optional[str] = None
    ai_evaluation: Optional[str] = None
    challenge_difficulty: str = "medium"
    response_quality: Optional[float] = None
    assumption_strength: Optional[float] = None
    is_resolved: bool = False
    strengthens_strategy: Optional[bool] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class RedTeamChallenge(RedTeamChallengeBase):
    """Red team challenge with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

class StrategicInsightBase(BaseModel):
    """Base strategic insight model"""
    session_id: str
    insight_text: str
    insight_type: str  # pattern, contradiction, opportunity, risk
    supporting_evidence_ids: List[str] = Field(default_factory=list)
    confidence_score: float = 0.0
    strategic_impact: str = "medium"  # low, medium, high, critical
    actionability: str = "medium"
    is_validated: bool = False
    is_actionable: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    validated_at: Optional[datetime] = None

class StrategicInsight(StrategicInsightBase):
    """Strategic insight with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

class AnalysisMetricsBase(BaseModel):
    """Base analysis metrics model"""
    session_id: str
    total_evidence_count: int = 0
    high_quality_evidence_count: int = 0
    evidence_diversity_score: float = 0.0
    total_options_generated: int = 0
    viable_options_count: int = 0
    average_option_confidence: float = 0.0
    analysis_duration_minutes: int = 0
    phase_transitions: List[Dict[str, Any]] = Field(default_factory=list)
    user_engagement_score: float = 0.0
    strategic_coherence_score: float = 0.0
    assumption_validation_rate: float = 0.0
    red_team_challenge_success_rate: float = 0.0
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class AnalysisMetrics(AnalysisMetricsBase):
    """Analysis metrics with database ID"""
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

# Request/Response Models for API

class StrategicSessionCreate(BaseModel):
    """Request model for creating a strategic session"""
    title: str
    description: Optional[str] = None
    workspace_id: Optional[str] = None

class StrategicSessionResponse(BaseModel):
    """Response model for strategic session"""
    id: str
    user_id: str
    workspace_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    current_phase: AnalysisPhase
    context_data: Dict[str, Any]
    session_state: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

class EvidenceCreate(BaseModel):
    """Request model for creating evidence"""
    content: str
    source: str
    evidence_type: Optional[str] = None
    quality: EvidenceQuality = EvidenceQuality.MEDIUM
    confidence_score: float = 0.5
    tags: List[str] = Field(default_factory=list)

class StrategicOptionCreate(BaseModel):
    """Request model for creating strategic option"""
    title: str
    description: str
    rationale: Optional[str] = None

class LightningBriefCreate(BaseModel):
    """Request model for creating lightning brief"""
    situation_summary: str
    key_insights: List[str]
    critical_assumptions: List[str]
    next_actions: List[str]
    confidence_level: str

class RedTeamChallengeCreate(BaseModel):
    """Request model for creating red team challenge"""
    challenge_type: str
    challenge_question: str
    target_assumption: Optional[str] = None
    target_option_id: Optional[str] = None

class RedTeamChallengeResponse(BaseModel):
    """Request model for responding to red team challenge"""
    user_response: str

# Utility functions for data models

def create_strategic_session(user_id: str, title: str, description: str = None, workspace_id: str = None) -> StrategicSession:
    """Create a new strategic analysis session"""
    return StrategicSession(
        user_id=user_id,
        workspace_id=workspace_id,
        title=title,
        description=description,
        current_phase=AnalysisPhase.RECONNAISSANCE,
        context_data={},
        session_state={}
    )

def add_evidence_to_session(session_id: str, content: str, source: str, quality: EvidenceQuality = EvidenceQuality.MEDIUM, confidence: float = 0.5) -> StrategicEvidence:
    """Add evidence to a strategic session"""
    return StrategicEvidence(
        session_id=session_id,
        content=content,
        source=source,
        quality=quality,
        confidence_score=confidence
    )

def create_strategic_option(session_id: str, title: str, description: str, rationale: str = None) -> StrategicOption:
    """Create a strategic option"""
    return StrategicOption(
        session_id=session_id,
        title=title,
        description=description,
        rationale=rationale
    )

def generate_lightning_brief(session_id: str, situation_summary: str, key_insights: List[str], assumptions: List[str], next_actions: List[str], confidence_level: str) -> LightningBrief:
    """Generate a lightning brief"""
    return LightningBrief(
        session_id=session_id,
        situation_summary=situation_summary,
        key_insights=key_insights,
        critical_assumptions=assumptions,
        next_actions=next_actions,
        confidence_level=confidence_level
    )

def create_red_team_challenge(session_id: str, challenge_type: str, question: str, target_assumption: str = None, target_option_id: str = None) -> RedTeamChallenge:
    """Create a red team challenge"""
    return RedTeamChallenge(
        session_id=session_id,
        challenge_type=challenge_type,
        challenge_question=question,
        target_assumption=target_assumption,
        target_option_id=target_option_id
    )