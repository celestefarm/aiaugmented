#!/usr/bin/env python3
"""
Test script to verify agent responses are working after fixing model configuration.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import connect_to_mongo, close_mongo_connection, get_database
from utils.seed_agents import get_agent_by_id
from routers.interactions import call_openai_api, create_system_prompt

async def test_agent_response():
    """Test that agents can generate responses with the corrected model configuration."""
    
    print("🧪 Testing Agent Response Functionality")
    print("=" * 50)
    
    try:
        # Connect to database
        await connect_to_mongo()
        print("✅ Connected to database")
        
        # Get the strategist agent
        agent = await get_agent_by_id("strategist")
        if not agent:
            print("❌ Strategist agent not found")
            return False
            
        print(f"✅ Found agent: {agent.name}")
        print(f"📋 Model configured: {agent.model_name}")
        
        # Check if OpenAI API key is configured
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("❌ OPENAI_API_KEY not configured")
            return False
        print("✅ OpenAI API key is configured")
        
        # Create system prompt
        system_prompt = create_system_prompt(agent)
        print(f"✅ System prompt created ({len(system_prompt)} characters)")
        
        # Test message
        test_message = "Hello! Can you help me with strategic planning for a new product launch?"
        print(f"📝 Test message: {test_message}")
        
        # Call OpenAI API
        print("🤖 Calling OpenAI API...")
        try:
            response = await call_openai_api(agent.model_name, test_message, system_prompt)
            print("✅ API call successful!")
            print(f"📄 Response length: {len(response)} characters")
            print(f"📄 Response preview: {response[:200]}...")
            return True
            
        except Exception as api_error:
            print(f"❌ API call failed: {api_error}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False
        
    finally:
        await close_mongo_connection()
        print("🔌 Disconnected from database")

async def main():
    """Main test function."""
    success = await test_agent_response()
    
    if success:
        print("\n🎉 SUCCESS: Agent response functionality is working!")
        print("✅ The agents should now be able to respond to user messages.")
    else:
        print("\n❌ FAILURE: Agent response functionality is not working.")
        print("🔧 Please check the error messages above for troubleshooting.")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)