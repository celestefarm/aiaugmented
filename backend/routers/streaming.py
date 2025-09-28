from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, AsyncGenerator
from models.user import UserInDB
from utils.dependencies import get_current_user
from utils.seed_agents import get_agent_by_id
from utils.performance_monitor import perf_monitor
from utils.text_chunking import TokenEstimator, ModelConfig
from routers.messages import get_workspace_documents_content
from routers.interactions import create_system_prompt
from database_memory import get_database
from bson import ObjectId
import httpx
import json
import os
import logging
import asyncio

router = APIRouter(tags=["streaming"])
logger = logging.getLogger(__name__)
token_estimator = TokenEstimator()

class StreamingMessageRequest(BaseModel):
    """Request model for streaming message responses"""
    content: str = Field(..., min_length=1, max_length=2000, description="Message content")
    agent_id: Optional[str] = Field(default="strategist", description="Agent ID to use for response")

async def stream_openai_response(
    model: str, 
    prompt: str, 
    system_prompt: str
) -> AsyncGenerator[str, None]:
    """Stream response from OpenAI API with real-time token delivery"""
    
    # PERFORMANCE MONITORING: Start timing the streaming API call
    stream_timer = perf_monitor.start_timer(f"openai_streaming_{model}")
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'error': 'OpenAI API key not configured'})}\n\n"
        return
    
    # Extract model name (remove provider prefix if present)
    model_name = model.split("/")[-1] if "/" in model else model
    
    # Get model configuration for token limits
    model_config = ModelConfig.get_config(model_name)
    
    # Estimate tokens for input
    system_tokens = token_estimator.estimate_tokens(system_prompt)
    user_tokens = token_estimator.estimate_tokens(prompt)
    max_response_tokens = 1000  # Reserve for response
    
    total_input_tokens = system_tokens + user_tokens
    total_required_tokens = total_input_tokens + max_response_tokens
    
    logger.info(f"🚀 [STREAMING] Starting streaming response for {model_name}")
    logger.info(f"📊 [STREAMING] Token estimation: system={system_tokens}, user={user_tokens}, total={total_required_tokens}")
    
    # Check token limits and truncate if necessary
    if total_required_tokens > model_config.context_limit:
        logger.warning(f"⚠️ [STREAMING] Token limit exceeded, truncating content")
        # Implement truncation logic similar to non-streaming version
        if system_tokens > model_config.context_limit * 0.6:
            max_system_tokens = int(model_config.context_limit * 0.6)
            # Simple truncation for streaming (more sophisticated truncation can be added)
            system_prompt = system_prompt[:max_system_tokens * 3] + "... [truncated]"
            system_tokens = token_estimator.estimate_tokens(system_prompt)
        
        remaining_tokens = model_config.context_limit - system_tokens - max_response_tokens
        if user_tokens > remaining_tokens:
            prompt = prompt[:remaining_tokens * 3] + "... [truncated]"
            user_tokens = token_estimator.estimate_tokens(prompt)
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": max_response_tokens,
        "temperature": 0.7,
        "stream": True  # Enable streaming
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            logger.info(f"🌊 [STREAMING] Initiating streaming request to OpenAI")
            
            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Connected to AI model, starting response...'})}\n\n"
            
            async with client.stream(
                "POST",
                "https://api.openai.com/v1/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                
                if response.status_code != 200:
                    error_text = await response.aread()
                    logger.error(f"❌ [STREAMING] OpenAI API error: {response.status_code} - {error_text}")
                    yield f"data: {json.dumps({'type': 'error', 'message': f'API Error: {response.status_code}'})}\n\n"
                    return
                
                logger.info(f"✅ [STREAMING] Successfully connected to OpenAI streaming API")
                yield f"data: {json.dumps({'type': 'status', 'message': 'Receiving AI response...'})}\n\n"
                
                full_response = ""
                chunk_count = 0
                
                async for chunk in response.aiter_lines():
                    # Convert bytes to string for processing
                    if isinstance(chunk, bytes):
                        chunk_str = chunk.decode('utf-8')
                    else:
                        chunk_str = chunk
                    
                    if chunk_str.startswith("data: "):
                        chunk_data = chunk_str[6:]  # Remove "data: " prefix
                        
                        if chunk_data == "[DONE]":
                            logger.info(f"🏁 [STREAMING] Stream completed after {chunk_count} chunks")
                            break
                        
                        try:
                            data = json.loads(chunk_data)
                            
                            if "choices" in data and len(data["choices"]) > 0:
                                delta = data["choices"][0].get("delta", {})
                                
                                if "content" in delta:
                                    content = delta["content"]
                                    full_response += content
                                    chunk_count += 1
                                    
                                    # Stream the content chunk to the client
                                    yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                                    
                                    # Add small delay to prevent overwhelming the client
                                    await asyncio.sleep(0.01)
                        
                        except json.JSONDecodeError as e:
                            logger.warning(f"⚠️ [STREAMING] Failed to parse chunk: {e}")
                            continue
                
                # Send completion signal
                duration = perf_monitor.end_timer(stream_timer, {
                    'model': model_name,
                    'chunks_received': chunk_count,
                    'response_length': len(full_response),
                    'success': True
                })
                
                logger.info(f"✅ [STREAMING] Completed streaming response in {duration:.2f}s")
                logger.info(f"📊 [STREAMING] Response stats: {chunk_count} chunks, {len(full_response)} characters")
                
                yield f"data: {json.dumps({'type': 'complete', 'total_length': len(full_response), 'duration': duration})}\n\n"
                
    except httpx.TimeoutException:
        perf_monitor.end_timer(stream_timer, {'error': 'timeout', 'success': False})
        logger.error(f"⏰ [STREAMING] Request timed out")
        yield f"data: {json.dumps({'type': 'error', 'message': 'Request timed out. Please try again.'})}\n\n"
        
    except Exception as e:
        perf_monitor.end_timer(stream_timer, {'error': str(e), 'success': False})
        logger.error(f"❌ [STREAMING] Unexpected error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': f'Unexpected error: {str(e)}'})}\n\n"

@router.post("/workspaces/{workspace_id}/messages/stream")
async def stream_message_response(
    workspace_id: str,
    request: StreamingMessageRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """
    Stream AI response in real-time for better user experience.
    Returns Server-Sent Events (SSE) stream.
    """
    
    # PERFORMANCE MONITORING: Time the entire streaming pipeline
    pipeline_timer = perf_monitor.start_timer("streaming_message_pipeline")
    
    # Validate ObjectId format
    if not ObjectId.is_valid(workspace_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace ID format"
        )
    
    # Get database instance
    database = get_database()
    
    # Verify workspace exists and user owns it
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": current_user.id
    })
    
    if not workspace_doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Get the agent
    agent = await get_agent_by_id(request.agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check if agent has a model configured
    if not agent.model_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Agent does not have an AI model configured"
        )
    
    async def generate_stream():
        try:
            logger.info(f"🌊 [STREAMING] Starting stream for workspace {workspace_id}")
            
            # Get document context for AI agents
            document_context = await get_workspace_documents_content(database, workspace_id)
            
            # Generate system prompt
            system_prompt = create_system_prompt(agent)
            
            # Combine user message with document context
            user_prompt = request.content
            if document_context:
                user_prompt = f"{document_context}\nUser Question: {request.content}"
                logger.info(f"📄 [STREAMING] Enhanced prompt with document context ({len(document_context)} chars)")
            
            # Stream the response
            if agent.model_name.startswith("openai/") or agent.model_name.startswith("gpt-"):
                async for chunk in stream_openai_response(agent.model_name, user_prompt, system_prompt):
                    yield chunk
            else:
                yield f"data: {json.dumps({'type': 'error', 'message': f'Unsupported model: {agent.model_name}'})}\n\n"
            
            # End pipeline timer
            perf_monitor.end_timer(pipeline_timer, {
                'workspace_id': workspace_id,
                'agent_id': request.agent_id,
                'message_length': len(request.content),
                'success': True
            })
            
        except Exception as e:
            perf_monitor.end_timer(pipeline_timer, {'error': str(e), 'success': False})
            logger.error(f"❌ [STREAMING] Pipeline error: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': f'Pipeline error: {str(e)}'})}\n\n"
    
    return StreamingResponse(
        generate_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )