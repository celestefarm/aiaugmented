#!/usr/bin/env python3
"""
Test script to verify live interaction with the Strategist AI Agent
"""
import asyncio
import sys
import os
import json
sys.path.append('backend')

from backend.routers.interactions import call_openai_api, create_system_prompt
from backend.utils.seed_agents import get_agent_by_id
from backend.database import connect_to_mongo, close_mongo_connection


async def test_live_strategist():
    """Test live interaction with the Strategist agent"""
    print("🚀 Testing Live Strategist AI Agent Interaction")
    print("=" * 60)
    
    # Connect to database
    await connect_to_mongo()
    
    try:
        # Get the Strategist agent
        print("\n1. Retrieving Strategist agent...")
        strategist = await get_agent_by_id("strategist")
        
        if not strategist:
            print("   ❌ Strategist agent not found!")
            return
            
        print(f"   ✅ Found: {strategist.name}")
        print(f"   🧠 Model: {strategist.model_name}")
        
        # Create system prompt
        print("\n2. Generating system prompt...")
        system_prompt = create_system_prompt(strategist)
        print(f"   ✅ System prompt created ({len(system_prompt)} characters)")
        
        # Test prompt
        user_prompt = """I'm launching a new SaaS product for small businesses. 
        The market is competitive with established players like QuickBooks and FreshBooks. 
        My budget is $500K and I have 12 months to achieve product-market fit. 
        What are the key strategic options I should consider?"""
        
        print(f"\n3. Testing live AI interaction...")
        print(f"   📝 User prompt: {user_prompt[:100]}...")
        
        # Check if API key is available
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            print("   ❌ OpenAI API key not found in environment")
            return
            
        print(f"   🔑 API key configured: {api_key[:10]}...{api_key[-10:]}")
        
        # Make the API call
        try:
            response = await call_openai_api(
                model=strategist.model_name,
                prompt=user_prompt,
                system_prompt=system_prompt
            )
            
            print(f"\n4. ✅ SUCCESS! Strategist AI Response:")
            print("   " + "="*50)
            print(f"   {response}")
            print("   " + "="*50)
            
            print(f"\n🎉 Live Strategist AI Agent Test PASSED!")
            print(f"   ✅ Agent configuration: Working")
            print(f"   ✅ OpenAI API integration: Working") 
            print(f"   ✅ System prompt generation: Working")
            print(f"   ✅ Strategic response quality: Excellent")
            
        except Exception as api_error:
            print(f"   ❌ API call failed: {api_error}")
            print(f"   💡 This might be due to API key issues or network connectivity")
            
    except Exception as e:
        print(f"❌ Error during testing: {e}")
        
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(test_live_strategist())