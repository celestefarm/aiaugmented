"""
Anthropic Claude API integration for AI agent interactions.
Provides both streaming and non-streaming API calls to Claude models.
"""

import os
import httpx
import json
import logging
import asyncio
from typing import AsyncGenerator
from fastapi import HTTPException, status
from utils.performance_monitor import perf_monitor

logger = logging.getLogger(__name__)


async def call_anthropic_api(model: str, prompt: str, system_prompt: str) -> str:
    """
    Call Anthropic Claude API with the given model and prompts.
    
    Args:
        model: Model identifier (e.g., "claude-3-5-sonnet", "anthropic/claude-3-opus")
        prompt: User's input prompt
        system_prompt: System context and instructions
        
    Returns:
        str: AI-generated response text
        
    Raises:
        HTTPException: If API call fails
    """
    
    # Start performance monitoring
    api_timer = perf_monitor.start_timer(f"anthropic_api_call_{model}")
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        perf_monitor.end_timer(api_timer, {'error': 'No API key configured'})
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Anthropic API key not configured"
        )
    
    # Extract model name (remove provider prefix if present)
    model_name = model.split("/")[-1] if "/" in model else model
    
    # Map to actual Anthropic model names
    model_map = {
        "claude-sonnet-4.5": "claude-sonnet-4.5",  # Latest model
        "claude-4-5-sonnet": "claude-sonnet-4.5",  # Alternative naming
        "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
        "claude-3-sonnet": "claude-3-sonnet-20240229",
        "claude-3-opus": "claude-3-opus-20240229",
        "claude-3-haiku": "claude-3-haiku-20240307",
        "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",  # Alternative naming
    }
    
    anthropic_model = model_map.get(model_name, "claude-3-5-sonnet-20241022")
    
    logger.info(f"🚀 [ANTHROPIC-API] Starting request to Claude for model {anthropic_model}")
    logger.info(f"📊 [ANTHROPIC-API] System prompt length: {len(system_prompt)}, User prompt length: {len(prompt)}")
    
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": anthropic_model,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7
    }
    
    async with httpx.AsyncClient(timeout=90.0) as client:
        try:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            response_content = result["content"][0]["text"]
            
            logger.info(f"✅ [ANTHROPIC-API] Response received: {len(response_content)} characters")
            
            # End performance monitoring
            perf_monitor.end_timer(api_timer, {
                'model': anthropic_model,
                'response_length': len(response_content),
                'success': True
            })
            
            perf_monitor.log_api_metrics(
                model=anthropic_model,
                input_tokens=len(prompt.split()) + len(system_prompt.split()),
                response_tokens=len(response_content.split()),
                duration=0,
                success=True
            )
            
            return response_content
            
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text if hasattr(e.response, 'text') else str(e)
            logger.error(f"❌ [ANTHROPIC-API] HTTP Error {e.response.status_code}: {error_detail}")
            
            if e.response.status_code == 429:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Anthropic API is temporarily limiting requests. Please wait and try again."
                )
            elif e.response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Anthropic API key. Please check your configuration."
                )
            elif e.response.status_code == 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Bad request to Anthropic API. Please check your input."
                )
            
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Anthropic API error: {e.response.status_code}"
            )
        except httpx.TimeoutException:
            perf_monitor.end_timer(api_timer, {'error': 'timeout', 'success': False})
            logger.error(f"⏰ [ANTHROPIC-API] Request timed out")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Anthropic API request timed out"
            )
        except Exception as e:
            perf_monitor.end_timer(api_timer, {'error': str(e), 'success': False})
            logger.error(f"❌ [ANTHROPIC-API] Unexpected error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to call Anthropic API: {str(e)}"
            )


async def stream_anthropic_response(
    model: str,
    prompt: str,
    system_prompt: str
) -> AsyncGenerator[str, None]:
    """
    Stream response from Anthropic Claude API with real-time token delivery.
    
    Args:
        model: Model identifier
        prompt: User's input prompt
        system_prompt: System context and instructions
        
    Yields:
        str: Server-Sent Events formatted strings with response chunks
    """
    
    stream_timer = perf_monitor.start_timer(f"anthropic_streaming_{model}")
    
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        yield f"data: {json.dumps({'type': 'error', 'message': 'Anthropic API key not configured'})}\n\n"
        return
    
    # Extract and map model name
    model_name = model.split("/")[-1] if "/" in model else model
    model_map = {
        "claude-3-5-sonnet": "claude-3-5-sonnet-20241022",
        "claude-3-sonnet": "claude-3-sonnet-20240229",
        "claude-3-opus": "claude-3-opus-20240229",
        "claude-3-haiku": "claude-3-haiku-20240307",
        "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
    }
    anthropic_model = model_map.get(model_name, "claude-3-5-sonnet-20241022")
    
    logger.info(f"🌊 [ANTHROPIC-STREAMING] Starting streaming for {anthropic_model}")
    logger.info(f"📊 [ANTHROPIC-STREAMING] System: {len(system_prompt)} chars, User: {len(prompt)} chars")
    
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": anthropic_model,
        "max_tokens": 4096,
        "system": system_prompt,
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7,
        "stream": True
    }
    
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            # Send initial status
            yield f"data: {json.dumps({'type': 'status', 'message': 'Connected to Claude, starting response...'})}\n\n"
            
            async with client.stream(
                "POST",
                "https://api.anthropic.com/v1/messages",
                headers=headers,
                json=payload
            ) as response:
                
                if response.status_code != 200:
                    error_text = await response.aread()
                    error_text_str = error_text.decode('utf-8') if isinstance(error_text, bytes) else str(error_text)
                    logger.error(f"❌ [ANTHROPIC-STREAMING] API error: {response.status_code} - {error_text_str}")
                    
                    # Provide user-friendly error messages
                    if response.status_code == 429:
                        error_message = "Rate limit exceeded. Please wait 60 seconds and try again, or check your Anthropic API usage."
                    elif response.status_code == 401:
                        error_message = "Authentication failed. Please check your Anthropic API key configuration."
                    elif response.status_code == 400:
                        error_message = "Invalid request to Claude. Please try rephrasing your message."
                    elif response.status_code == 500:
                        error_message = "Anthropic service error. Please try again in a moment."
                    else:
                        error_message = f"API Error: {response.status_code}"
                    
                    yield f"data: {json.dumps({'type': 'error', 'message': error_message})}\n\n"
                    return
                
                logger.info(f"✅ [ANTHROPIC-STREAMING] Successfully connected to Claude streaming API")
                yield f"data: {json.dumps({'type': 'status', 'message': 'Receiving Claude response...'})}\n\n"
                
                full_response = ""
                chunk_count = 0
                
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    
                    if line.startswith("data: "):
                        data_str = line[6:]
                        
                        if data_str.strip() == "":
                            continue
                        
                        try:
                            data = json.loads(data_str)
                            event_type = data.get("type")
                            
                            # Handle different event types from Claude streaming
                            if event_type == "content_block_delta":
                                delta = data.get("delta", {})
                                if delta.get("type") == "text_delta":
                                    content = delta.get("text", "")
                                    if content:
                                        full_response += content
                                        chunk_count += 1
                                        
                                        # Stream to client
                                        yield f"data: {json.dumps({'type': 'content', 'content': content})}\n\n"
                                        await asyncio.sleep(0.01)
                            
                            elif event_type == "message_stop":
                                logger.info(f"🏁 [ANTHROPIC-STREAMING] Stream completed after {chunk_count} chunks")
                                break
                            
                            elif event_type == "error":
                                error_msg = data.get("error", {}).get("message", "Unknown error")
                                logger.error(f"❌ [ANTHROPIC-STREAMING] Stream error: {error_msg}")
                                yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"
                                return
                        
                        except json.JSONDecodeError as e:
                            logger.warning(f"⚠️ [ANTHROPIC-STREAMING] Failed to parse line: {e}")
                            continue
                
                # Send completion signal
                duration = perf_monitor.end_timer(stream_timer, {
                    'model': anthropic_model,
                    'chunks_received': chunk_count,
                    'response_length': len(full_response),
                    'success': True
                })
                
                logger.info(f"✅ [ANTHROPIC-STREAMING] Completed in {duration:.2f}s")
                logger.info(f"📊 [ANTHROPIC-STREAMING] Stats: {chunk_count} chunks, {len(full_response)} characters")
                
                yield f"data: {json.dumps({'type': 'complete', 'total_length': len(full_response), 'duration': duration})}\n\n"
                
    except httpx.TimeoutException:
        perf_monitor.end_timer(stream_timer, {'error': 'timeout', 'success': False})
        logger.error(f"⏰ [ANTHROPIC-STREAMING] Request timed out")
        yield f"data: {json.dumps({'type': 'error', 'message': 'Request timed out. Please try again.'})}\n\n"
        
    except Exception as e:
        perf_monitor.end_timer(stream_timer, {'error': str(e), 'success': False})
        logger.error(f"❌ [ANTHROPIC-STREAMING] Unexpected error: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': f'Unexpected error: {str(e)}'})}\n\n"