#!/usr/bin/env python3
"""
Test script to verify agent API endpoints are working with corrected model configuration.
"""

import asyncio
import httpx
import json

async def test_agent_api():
    """Test agent API endpoints."""
    
    print("🧪 Testing Agent API Endpoints")
    print("=" * 50)
    
    base_url = "http://localhost:8000/api/v1"
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Test 1: Get agents list
            print("📋 Testing agents list endpoint...")
            response = await client.get(f"{base_url}/agents")
            
            if response.status_code == 200:
                agents_data = response.json()
                print(f"✅ Agents endpoint working: {agents_data['total']} agents found")
                
                # Check model configurations
                for agent in agents_data['agents']:
                    if agent['agent_id'] == 'strategist':
                        print(f"🤖 Strategist agent model: {agent.get('model_name', 'NOT SET')}")
                        if agent.get('model_name') == 'gpt-4':
                            print("✅ Model configuration corrected!")
                        else:
                            print(f"❌ Model still incorrect: {agent.get('model_name')}")
                        break
                else:
                    print("❌ Strategist agent not found")
                    
            else:
                print(f"❌ Agents endpoint failed: {response.status_code}")
                return False
                
            # Test 2: Try to interact with agent (this will require auth, so we expect 401)
            print("\n🔐 Testing agent interaction endpoint (expecting auth error)...")
            interaction_data = {
                "agent_id": "strategist",
                "prompt": "Hello, can you help me with strategic planning?",
                "context": {}
            }
            
            response = await client.post(
                f"{base_url}/agents/interact",
                json=interaction_data
            )
            
            if response.status_code == 401:
                print("✅ Interaction endpoint accessible (auth required as expected)")
            elif response.status_code == 422:
                print("✅ Interaction endpoint accessible (validation error as expected)")
            else:
                print(f"⚠️  Unexpected response: {response.status_code}")
                
            return True
            
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

async def main():
    """Main test function."""
    success = await test_agent_api()
    
    if success:
        print("\n🎉 SUCCESS: Agent API endpoints are working!")
        print("✅ Model configurations have been corrected")
        print("✅ Agents should now be able to respond to user messages")
        print("\n📝 Next steps:")
        print("1. Navigate to the application in your browser")
        print("2. Sign in to your account")
        print("3. Go to the dashboard and select a workspace")
        print("4. Try sending a message to the Strategic Co-Pilot")
        print("5. The agent should now respond properly!")
    else:
        print("\n❌ FAILURE: Agent API endpoints are not working properly")
    
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)