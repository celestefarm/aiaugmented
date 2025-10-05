from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from models.user import UserInDB
from utils.dependencies import get_current_user
from utils.summarization import conversation_summarizer
from routers.interactions import call_openai_api
from database import get_database
from bson import ObjectId
import logging

router = APIRouter(tags=["AI Summarization"])
logger = logging.getLogger(__name__)


class ExecutiveSummaryRequest(BaseModel):
    """Request model for generating executive summary from conversation data"""
    node_id: str = Field(..., description="Node ID to generate summary for")
    conversation_context: Optional[str] = Field(None, description="Additional conversation context")
    include_related_messages: bool = Field(True, description="Include related chat messages in analysis")


class ExecutiveSummaryResponse(BaseModel):
    """Response model for executive summary generation"""
    executive_summary: List[str] = Field(..., description="Executive summary as bullet points")
    confidence: int = Field(..., description="Confidence score (0-100)")
    method_used: str = Field(..., description="Method used for generation")
    sources_analyzed: int = Field(..., description="Number of sources analyzed")
    related_messages_count: int = Field(..., description="Number of related messages found")


async def generate_ai_executive_summary(
    conversation_text: str,
    node_context: Dict[str, Any],
    related_messages: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Generate AI-powered executive summary using OpenAI API
    
    Args:
        conversation_text: Main conversation text from the node
        node_context: Context about the node (title, type, source_agent, etc.)
        related_messages: Related chat messages for additional context
        
    Returns:
        Dictionary with executive_summary, confidence, and metadata
    """
    try:
        # Build comprehensive context for AI analysis
        context_parts = []
        
        # Add node context
        if node_context.get('title'):
            context_parts.append(f"Node Title: {node_context['title']}")
        if node_context.get('type'):
            context_parts.append(f"Node Type: {node_context['type']}")
        if node_context.get('source_agent'):
            context_parts.append(f"Created by Agent: {node_context['source_agent']}")
        
        # Add main conversation content
        if conversation_text:
            context_parts.append(f"Main Content: {conversation_text}")
        
        # Add related messages context
        if related_messages:
            context_parts.append("Related Conversation Messages:")
            for msg in related_messages[-5:]:  # Last 5 related messages
                author_type = "AI Agent" if msg.get('type') == 'ai' else "Human"
                context_parts.append(f"- {author_type} ({msg.get('author', 'Unknown')}): {msg.get('content', '')[:100]}...")
        
        full_context = "\n".join(context_parts)
        
        # Create AI prompt for executive summary generation
        system_prompt = """You are an expert strategic analyst specializing in generating concise executive summaries from conversation data.

Your task is to analyze the provided conversation content and generate a bullet-point executive summary that captures the key strategic insights, decisions, and actionable items.

REQUIREMENTS:
1. Generate exactly 3-5 bullet points
2. Each bullet point should be 10-15 words maximum
3. Focus on strategic insights, key decisions, and actionable outcomes
4. Use clear, professional language
5. Prioritize the most important and actionable information
6. If the content lacks specific details, acknowledge this constructively

FORMAT: Return only the bullet points, one per line, starting with "•" """

        user_prompt = f"""Analyze this conversation data and generate an executive summary:

{full_context}

Generate 3-5 concise bullet points that capture the most important strategic insights and actionable items from this conversation."""

        # Call OpenAI API
        ai_response = await call_openai_api("gpt-4", user_prompt, system_prompt)
        
        # Parse AI response into bullet points
        bullet_points = []
        for line in ai_response.split('\n'):
            line = line.strip()
            if line and (line.startswith('•') or line.startswith('-') or line.startswith('*')):
                # Clean up the bullet point
                clean_point = line.lstrip('•-* ').strip()
                if clean_point and len(clean_point) > 5:
                    bullet_points.append(clean_point)
        
        # Ensure we have 3-5 bullet points
        if len(bullet_points) < 3:
            # Add fallback points if AI didn't generate enough
            fallback_points = [
                "Requires additional context for comprehensive analysis",
                "Strategic direction depends on specific objectives",
                "Implementation approach needs further clarification"
            ]
            for point in fallback_points:
                if len(bullet_points) < 3:
                    bullet_points.append(point)
        
        # Limit to 5 points maximum
        bullet_points = bullet_points[:5]
        
        # Calculate confidence based on content quality
        confidence = 85 if len(full_context) > 200 else 70
        if related_messages:
            confidence += 10
        if node_context.get('source_agent'):
            confidence += 5
        
        return {
            'executive_summary': bullet_points,
            'confidence': min(100, confidence),
            'method_used': 'ai_powered',
            'sources_analyzed': 1 + len(related_messages),
            'related_messages_count': len(related_messages)
        }
        
    except Exception as e:
        logger.error(f"AI executive summary generation failed: {e}")
        
        # Fallback to local NLP summarization
        fallback_result = conversation_summarizer.summarize_conversation(conversation_text)
        
        # Convert to bullet point format
        bullet_points = []
        if fallback_result.get('keynote_points'):
            bullet_points = fallback_result['keynote_points'][:5]
        else:
            bullet_points = [
                "Analysis requires more specific context",
                "Strategic approach needs further definition",
                "Implementation details need clarification"
            ]
        
        return {
            'executive_summary': bullet_points,
            'confidence': 50,
            'method_used': 'fallback_nlp',
            'sources_analyzed': 1,
            'related_messages_count': 0
        }


@router.post("/nodes/{node_id}/executive-summary", response_model=ExecutiveSummaryResponse)
async def generate_executive_summary(
    node_id: str,
    request: ExecutiveSummaryRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Generate AI-powered executive summary for a node based on conversation data.
    
    Args:
        node_id: Node ID to generate summary for
        request: Request parameters
        current_user: Current authenticated user
        
    Returns:
        Executive summary with bullet points and metadata
        
    Raises:
        HTTPException: If node not found or access denied
    """
    try:
        # Validate ObjectId format
        if not ObjectId.is_valid(node_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid node ID format"
            )
        
        # Get database instance
        database = get_database()
        
        # Find the node and verify access
        node_doc = await database.nodes.find_one({"_id": ObjectId(node_id)})
        if not node_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found"
            )
        
        # Verify workspace access
        workspace_doc = await database.workspaces.find_one({
            "_id": node_doc["workspace_id"],  # Use string format for consistency
            "owner_id": current_user.id
        })
        
        if not workspace_doc:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this node"
            )
        
        # Gather conversation context
        conversation_text = node_doc.get("description", "")
        if request.conversation_context:
            conversation_text += f"\n\nAdditional Context: {request.conversation_context}"
        
        # Build node context
        node_context = {
            'title': node_doc.get('title', ''),
            'type': node_doc.get('type', ''),
            'source_agent': node_doc.get('source_agent'),
            'created_at': node_doc.get('created_at')
        }
        
        # Find related messages if requested
        related_messages = []
        if request.include_related_messages:
            # Find messages related to this node
            # Use simple find without cursor methods for in-memory database compatibility
            messages_docs = []
            messages_cursor = database.messages.find({
                "workspace_id": node_doc["workspace_id"]  # Use string format for consistency
            })
            
            # Convert cursor to list for in-memory database compatibility
            if hasattr(messages_cursor, 'to_list'):
                # MongoDB-style cursor
                messages_docs = await messages_cursor.to_list(length=None)
            else:
                # In-memory database - iterate manually
                try:
                    async for msg_doc in messages_cursor:
                        messages_docs.append(msg_doc)
                except TypeError:
                    # Fallback for non-async cursor
                    for msg_doc in messages_cursor:
                        messages_docs.append(msg_doc)
            
            # Sort by created_at (most recent first) and limit to 20
            messages_docs = sorted(messages_docs, key=lambda x: x.get('created_at', ''), reverse=True)[:20]
            
            # Filter for related messages
            node_title_words = node_context['title'].lower().split()[:3]  # First 3 words
            for msg_doc in messages_docs:
                msg_content_lower = msg_doc.get('content', '').lower()
                
                # Check if message is related by content similarity or agent
                is_related = False
                
                # Check if message mentions node title words
                if any(word in msg_content_lower for word in node_title_words if len(word) > 3):
                    is_related = True
                
                # Check if message is from the same agent
                if (node_context.get('source_agent') and 
                    msg_doc.get('author') == node_context['source_agent']):
                    is_related = True
                
                if is_related:
                    related_messages.append({
                        'id': str(msg_doc['_id']),
                        'author': msg_doc.get('author', ''),
                        'type': msg_doc.get('type', ''),
                        'content': msg_doc.get('content', ''),
                        'created_at': msg_doc.get('created_at')
                    })
        
        # Generate AI-powered executive summary
        summary_result = await generate_ai_executive_summary(
            conversation_text,
            node_context,
            related_messages
        )
        
        logger.info(f"Generated executive summary for node {node_id}: "
                   f"{len(summary_result['executive_summary'])} points, "
                   f"confidence: {summary_result['confidence']}%")
        
        return ExecutiveSummaryResponse(**summary_result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to generate executive summary for node {node_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate executive summary"
        )