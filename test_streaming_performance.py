#!/usr/bin/env python3
"""
Test script to validate AI chat streaming performance improvements.
This script tests the streaming endpoint and measures response times.
"""

import asyncio
import aiohttp
import time
import json
from typing import AsyncGenerator

async def test_streaming_endpoint():
    """Test the streaming chat endpoint for performance improvements."""
    
    print("🧪 Testing AI Chat Streaming Performance Improvements")
    print("=" * 60)
    
    # Test configuration
    base_url = "http://localhost:8000"
    streaming_url = f"{base_url}/api/v1/stream-message"
    
    # Test message
    test_message = "Hello, can you help me understand the key benefits of streaming responses?"
    
    print(f"📝 Test Message: {test_message}")
    print(f"🔗 Streaming URL: {streaming_url}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test streaming endpoint
            print("🚀 Testing Streaming Response...")
            start_time = time.time()
            first_token_time = None
            total_content = ""
            chunk_count = 0
            
            payload = {
                "workspace_id": "test_workspace",
                "content": test_message,
                "agent_id": "strategist"
            }
            
            async with session.post(
                streaming_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    print(f"❌ Error: HTTP {response.status}")
                    text = await response.text()
                    print(f"Response: {text}")
                    return
                
                print(f"✅ Connection established (HTTP {response.status})")
                
                async for line in response.content:
                    if line:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            data_str = line_str[6:]  # Remove 'data: ' prefix
                            
                            if data_str == '[DONE]':
                                break
                                
                            try:
                                data = json.loads(data_str)
                                chunk_count += 1
                                
                                # Record first token time
                                if first_token_time is None and data.get('content'):
                                    first_token_time = time.time()
                                    time_to_first_token = first_token_time - start_time
                                    print(f"⚡ First token received in: {time_to_first_token:.2f}s")
                                
                                # Accumulate content
                                if data.get('content'):
                                    total_content += data['content']
                                    print(f"📦 Chunk {chunk_count}: {len(data['content'])} chars")
                                
                                # Show status updates
                                if data.get('status'):
                                    print(f"📊 Status: {data['status']}")
                                    
                            except json.JSONDecodeError:
                                print(f"⚠️  Invalid JSON: {data_str}")
            
            end_time = time.time()
            total_time = end_time - start_time
            
            print()
            print("📈 Performance Results:")
            print(f"   • Total Response Time: {total_time:.2f}s")
            if first_token_time:
                print(f"   • Time to First Token: {first_token_time - start_time:.2f}s")
            print(f"   • Total Chunks Received: {chunk_count}")
            print(f"   • Total Content Length: {len(total_content)} chars")
            print(f"   • Average Chunk Size: {len(total_content) / max(chunk_count, 1):.1f} chars")
            
            if total_content:
                print()
                print("📝 Sample Response Content:")
                print(f"   {total_content[:200]}{'...' if len(total_content) > 200 else ''}")
            
            # Performance assessment
            print()
            print("🎯 Performance Assessment:")
            if first_token_time and (first_token_time - start_time) < 3.0:
                print("   ✅ EXCELLENT: First token received in under 3 seconds")
            elif first_token_time and (first_token_time - start_time) < 5.0:
                print("   ✅ GOOD: First token received in under 5 seconds")
            else:
                print("   ⚠️  NEEDS IMPROVEMENT: First token took longer than expected")
            
            if chunk_count > 1:
                print("   ✅ STREAMING: Response delivered in multiple chunks")
            else:
                print("   ⚠️  NO STREAMING: Response delivered as single chunk")
                
    except aiohttp.ClientError as e:
        print(f"❌ Connection Error: {e}")
        print("   Make sure the backend server is running on http://localhost:8000")
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")

async def test_regular_endpoint_comparison():
    """Test the regular chat endpoint for comparison."""
    
    print("\n" + "=" * 60)
    print("🔄 Testing Regular Endpoint for Comparison")
    print("=" * 60)
    
    base_url = "http://localhost:8000"
    regular_url = f"{base_url}/api/v1/workspaces/test_workspace/messages"
    
    test_message = "Hello, can you help me understand the key benefits of streaming responses?"
    
    try:
        async with aiohttp.ClientSession() as session:
            print("🐌 Testing Regular Response...")
            start_time = time.time()
            
            payload = {"content": test_message}
            
            async with session.post(
                regular_url,
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status != 200:
                    print(f"❌ Error: HTTP {response.status}")
                    return
                
                result = await response.json()
                end_time = time.time()
                total_time = end_time - start_time
                
                print(f"✅ Response received in: {total_time:.2f}s")
                print(f"📊 Messages returned: {len(result.get('messages', []))}")
                
                # Find AI response
                ai_messages = [msg for msg in result.get('messages', []) if msg.get('type') == 'ai']
                if ai_messages:
                    ai_content = ai_messages[-1].get('content', '')
                    print(f"📝 AI Response Length: {len(ai_content)} chars")
                    print(f"   Sample: {ai_content[:200]}{'...' if len(ai_content) > 200 else ''}")
                
                print()
                print("🎯 Regular Endpoint Assessment:")
                if total_time < 5.0:
                    print("   ✅ FAST: Response received in under 5 seconds")
                elif total_time < 10.0:
                    print("   ⚠️  MODERATE: Response took 5-10 seconds")
                else:
                    print("   ❌ SLOW: Response took over 10 seconds")
                    
    except Exception as e:
        print(f"❌ Error testing regular endpoint: {e}")

async def main():
    """Main test function."""
    print("🧪 AI Chat Performance Test Suite")
    print("Testing streaming vs regular chat performance")
    print()
    
    # Test streaming endpoint
    await test_streaming_endpoint()
    
    # Test regular endpoint for comparison
    await test_regular_endpoint_comparison()
    
    print("\n" + "=" * 60)
    print("✅ Performance Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())