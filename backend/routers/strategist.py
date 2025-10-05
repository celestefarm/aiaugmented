from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

from models.user import UserResponse
from models.strategic_analysis import (
    StrategicSession, StrategicSessionCreate, StrategicSessionResponse,
    StrategicEvidence, EvidenceCreate, StrategicOption, StrategicOptionCreate,
    LightningBrief, LightningBriefCreate, RedTeamChallenge, RedTeamChallengeCreate,
    RedTeamChallengeResponse, AnalysisPhase, EvidenceQuality
)
from utils.dependencies import get_current_active_user
from database import get_database
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["strategist"])


class StrategicSessionUpdate(BaseModel):
    """Request model for updating strategic session"""
    title: Optional[str] = None
    description: Optional[str] = None
    current_phase: Optional[AnalysisPhase] = None
    context_data: Optional[Dict[str, Any]] = None
    session_state: Optional[Dict[str, Any]] = None


class StrategicAnalysisRequest(BaseModel):
    """Request model for strategic analysis"""
    session_id: str = Field(..., description="Strategic session ID")
    analysis_type: str = Field(..., description="Type of analysis to perform")
    content: str = Field(..., description="Content to analyze")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")


@router.post("/strategist/sessions", response_model=StrategicSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_strategic_session(
    session_data: StrategicSessionCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Create a new strategic analysis session.
    
    Args:
        session_data: Session creation data
        current_user: Current authenticated user
        
    Returns:
        Created strategic session
    """
    try:
        database = get_database()
        
        # Create session document
        session_doc = {
            "user_id": str(current_user.id),
            "workspace_id": session_data.workspace_id,
            "title": session_data.title,
            "description": session_data.description,
            "current_phase": AnalysisPhase.RECONNAISSANCE.value,
            "context_data": {},
            "session_state": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "completed_at": None
        }
        
        # Insert session
        result = await database.strategic_sessions.insert_one(session_doc)
        session_id = str(result.inserted_id)
        
        # Return response
        return StrategicSessionResponse(
            id=session_id,
            user_id=str(current_user.id),
            workspace_id=session_data.workspace_id,
            title=session_data.title,
            description=session_data.description,
            current_phase=AnalysisPhase.RECONNAISSANCE,
            context_data={},
            session_state={},
            created_at=session_doc["created_at"],
            updated_at=session_doc["updated_at"]
        )
        
    except Exception as e:
        logger.error(f"Error creating strategic session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create strategic session: {str(e)}"
        )


@router.get("/strategist/sessions", response_model=List[StrategicSessionResponse])
async def get_user_strategic_sessions(
    current_user: UserResponse = Depends(get_current_active_user),
    workspace_id: Optional[str] = None,
    limit: int = 20,
    skip: int = 0
):
    """
    Get user's strategic analysis sessions.
    
    Args:
        current_user: Current authenticated user
        workspace_id: Optional workspace filter
        limit: Maximum number of sessions to return
        skip: Number of sessions to skip
        
    Returns:
        List of strategic sessions
    """
    try:
        database = get_database()
        
        # Build query
        query = {"user_id": str(current_user.id)}
        if workspace_id:
            query["workspace_id"] = workspace_id
        
        # Get sessions
        cursor = database.strategic_sessions.find(query).sort("created_at", -1).skip(skip).limit(limit)
        sessions = await cursor.to_list(length=limit)
        
        # Convert to response models
        response_sessions = []
        for session in sessions:
            response_sessions.append(StrategicSessionResponse(
                id=str(session["_id"]),
                user_id=session["user_id"],
                workspace_id=session.get("workspace_id"),
                title=session["title"],
                description=session.get("description"),
                current_phase=AnalysisPhase(session["current_phase"]),
                context_data=session.get("context_data", {}),
                session_state=session.get("session_state", {}),
                created_at=session["created_at"],
                updated_at=session["updated_at"],
                completed_at=session.get("completed_at")
            ))
        
        return response_sessions
        
    except Exception as e:
        logger.error(f"Error getting strategic sessions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get strategic sessions: {str(e)}"
        )


@router.get("/strategist/sessions/{session_id}", response_model=StrategicSessionResponse)
async def get_strategic_session(
    session_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get a specific strategic analysis session.
    
    Args:
        session_id: Strategic session ID
        current_user: Current authenticated user
        
    Returns:
        Strategic session details
    """
    try:
        database = get_database()
        
        # Get session
        session = await database.strategic_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        return StrategicSessionResponse(
            id=str(session["_id"]),
            user_id=session["user_id"],
            workspace_id=session.get("workspace_id"),
            title=session["title"],
            description=session.get("description"),
            current_phase=AnalysisPhase(session["current_phase"]),
            context_data=session.get("context_data", {}),
            session_state=session.get("session_state", {}),
            created_at=session["created_at"],
            updated_at=session["updated_at"],
            completed_at=session.get("completed_at")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting strategic session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get strategic session: {str(e)}"
        )


@router.put("/strategist/sessions/{session_id}", response_model=StrategicSessionResponse)
async def update_strategic_session(
    session_id: str,
    update_data: StrategicSessionUpdate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Update a strategic analysis session.
    
    Args:
        session_id: Strategic session ID
        update_data: Session update data
        current_user: Current authenticated user
        
    Returns:
        Updated strategic session
    """
    try:
        database = get_database()
        
        # Build update fields
        update_fields = {"updated_at": datetime.utcnow()}
        
        if update_data.title is not None:
            update_fields["title"] = update_data.title
        if update_data.description is not None:
            update_fields["description"] = update_data.description
        if update_data.current_phase is not None:
            update_fields["current_phase"] = update_data.current_phase.value
        if update_data.context_data is not None:
            update_fields["context_data"] = update_data.context_data
        if update_data.session_state is not None:
            update_fields["session_state"] = update_data.session_state
        
        # Update session
        result = await database.strategic_sessions.update_one(
            {"_id": ObjectId(session_id), "user_id": str(current_user.id)},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Get updated session
        return await get_strategic_session(session_id, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating strategic session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update strategic session: {str(e)}"
        )


@router.post("/strategist/sessions/{session_id}/evidence")
async def add_evidence_to_session(
    session_id: str,
    evidence_data: EvidenceCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Add evidence to a strategic analysis session.
    
    Args:
        session_id: Strategic session ID
        evidence_data: Evidence data
        current_user: Current authenticated user
        
    Returns:
        Created evidence record
    """
    try:
        database = get_database()
        
        # Verify session exists and belongs to user
        session = await database.strategic_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Create evidence document
        evidence_doc = {
            "session_id": session_id,
            "content": evidence_data.content,
            "source": evidence_data.source,
            "evidence_type": evidence_data.evidence_type,
            "quality": evidence_data.quality.value,
            "confidence_score": evidence_data.confidence_score,
            "reliability_score": 0.5,  # Default value
            "tags": evidence_data.tags,
            "metadata": {},
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert evidence
        result = await database.strategic_evidence.insert_one(evidence_doc)
        evidence_id = str(result.inserted_id)
        
        return {
            "id": evidence_id,
            "session_id": session_id,
            "content": evidence_data.content,
            "source": evidence_data.source,
            "evidence_type": evidence_data.evidence_type,
            "quality": evidence_data.quality.value,
            "confidence_score": evidence_data.confidence_score,
            "tags": evidence_data.tags,
            "created_at": evidence_doc["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding evidence: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add evidence: {str(e)}"
        )


@router.post("/strategist/sessions/{session_id}/options")
async def add_strategic_option(
    session_id: str,
    option_data: StrategicOptionCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Add a strategic option to a session.
    
    Args:
        session_id: Strategic session ID
        option_data: Strategic option data
        current_user: Current authenticated user
        
    Returns:
        Created strategic option
    """
    try:
        database = get_database()
        
        # Verify session exists and belongs to user
        session = await database.strategic_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Create option document
        option_doc = {
            "session_id": session_id,
            "title": option_data.title,
            "description": option_data.description,
            "rationale": option_data.rationale,
            "confidence_score": 0.0,
            "feasibility_score": 0.0,
            "impact_score": 0.0,
            "risk_score": 0.0,
            "risk_factors": [],
            "opportunity_factors": [],
            "success_criteria": [],
            "supporting_evidence_ids": [],
            "is_recommended": False,
            "is_validated": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Insert option
        result = await database.strategic_options.insert_one(option_doc)
        option_id = str(result.inserted_id)
        
        return {
            "id": option_id,
            "session_id": session_id,
            "title": option_data.title,
            "description": option_data.description,
            "rationale": option_data.rationale,
            "created_at": option_doc["created_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding strategic option: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add strategic option: {str(e)}"
        )


@router.post("/strategist/sessions/{session_id}/brief")
async def generate_lightning_brief(
    session_id: str,
    brief_data: LightningBriefCreate,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Generate a lightning brief for a strategic session.
    
    Args:
        session_id: Strategic session ID
        brief_data: Lightning brief data
        current_user: Current authenticated user
        
    Returns:
        Generated lightning brief
    """
    try:
        database = get_database()
        
        # Verify session exists and belongs to user
        session = await database.strategic_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Create brief document
        brief_doc = {
            "session_id": session_id,
            "situation_summary": brief_data.situation_summary,
            "key_insights": brief_data.key_insights,
            "critical_assumptions": brief_data.critical_assumptions,
            "next_actions": brief_data.next_actions,
            "confidence_level": brief_data.confidence_level,
            "evidence_quality_score": 0.0,
            "strategic_alignment_score": 0.0,
            "brief_type": "standard",
            "priority_level": "medium",
            "is_approved": False,
            "is_implemented": False,
            "generated_at": datetime.utcnow(),
            "approved_at": None,
            "implemented_at": None
        }
        
        # Insert brief
        result = await database.lightning_briefs.insert_one(brief_doc)
        brief_id = str(result.inserted_id)
        
        return {
            "id": brief_id,
            "session_id": session_id,
            "situation_summary": brief_data.situation_summary,
            "key_insights": brief_data.key_insights,
            "critical_assumptions": brief_data.critical_assumptions,
            "next_actions": brief_data.next_actions,
            "confidence_level": brief_data.confidence_level,
            "generated_at": brief_doc["generated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating lightning brief: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lightning brief: {str(e)}"
        )


@router.get("/strategist/sessions/{session_id}/analysis")
async def get_session_analysis(
    session_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Get comprehensive analysis data for a strategic session.
    
    Args:
        session_id: Strategic session ID
        current_user: Current authenticated user
        
    Returns:
        Session analysis data including evidence, options, and briefs
    """
    try:
        database = get_database()
        
        # Verify session exists and belongs to user
        session = await database.strategic_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Get evidence
        evidence_cursor = database.strategic_evidence.find({"session_id": session_id})
        evidence = await evidence_cursor.to_list(length=None)
        
        # Get strategic options
        options_cursor = database.strategic_options.find({"session_id": session_id})
        options = await options_cursor.to_list(length=None)
        
        # Get lightning briefs
        briefs_cursor = database.lightning_briefs.find({"session_id": session_id})
        briefs = await briefs_cursor.to_list(length=None)
        
        # Convert ObjectIds to strings
        for item in evidence + options + briefs:
            item["id"] = str(item.pop("_id"))
        
        return {
            "session_id": session_id,
            "current_phase": session["current_phase"],
            "evidence": evidence,
            "strategic_options": options,
            "lightning_briefs": briefs,
            "analysis_summary": {
                "evidence_count": len(evidence),
                "options_count": len(options),
                "briefs_count": len(briefs),
                "high_quality_evidence": len([e for e in evidence if e.get("quality") == "high"]),
                "validated_options": len([o for o in options if o.get("is_validated", False)])
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session analysis: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session analysis: {str(e)}"
        )


@router.delete("/strategist/sessions/{session_id}")
async def delete_strategic_session(
    session_id: str,
    current_user: UserResponse = Depends(get_current_active_user)
):
    """
    Delete a strategic analysis session and all related data.
    
    Args:
        session_id: Strategic session ID
        current_user: Current authenticated user
        
    Returns:
        Deletion confirmation
    """
    try:
        database = get_database()
        
        # Verify session exists and belongs to user
        session = await database.strategic_sessions.find_one({
            "_id": ObjectId(session_id),
            "user_id": str(current_user.id)
        })
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Strategic session not found"
            )
        
        # Delete related data
        await database.strategic_evidence.delete_many({"session_id": session_id})
        await database.strategic_options.delete_many({"session_id": session_id})
        await database.lightning_briefs.delete_many({"session_id": session_id})
        await database.red_team_challenges.delete_many({"session_id": session_id})
        
        # Delete session
        await database.strategic_sessions.delete_one({"_id": ObjectId(session_id)})
        
        return {"message": "Strategic session deleted successfully", "session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting strategic session: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete strategic session: {str(e)}"
        )