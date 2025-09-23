#!/usr/bin/env python3

import requests
import json
import sys

def test_agent_api_with_auth():
    """Test agent API endpoints with proper authentication"""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 Testing Agent API with Authentication")
    print("=" * 50)
    
    # Step 1: Login to get authentication token
    print("🔐 Step 1: Authenticating...")
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    try:
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
            
        login_result = login_response.json()
        token = login_result.get("access_token")
        if not token:
            print("❌ No access token in login response")
            return False
            
        print("✅ Authentication successful")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False
    
    # Headers with authentication
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Test agents endpoint
    print("\n📋 Step 2: Testing agents endpoint...")
    try:
        agents_response = requests.get(f"{base_url}/agents", headers=headers)
        if agents_response.status_code != 200:
            print(f"❌ Agents endpoint failed: {agents_response.status_code}")
            print(f"Response: {agents_response.text}")
            return False
            
        agents_data = agents_response.json()
        agents = agents_data.get("agents", [])
        print(f"✅ Found {len(agents)} agents")
        
        # Show agent details
        for agent in agents:
            print(f"  - {agent.get('name', 'Unknown')} (ID: {agent.get('agent_id', 'Unknown')})")
            print(f"    Model: {agent.get('model_name', 'Not configured')}")
            print(f"    Active: {agent.get('is_active', False)}")
            
    except Exception as e:
        print(f"❌ Agents endpoint error: {e}")
        return False
    
    # Step 3: Get workspaces
    print("\n🏢 Step 3: Getting workspaces...")
    try:
        workspaces_response = requests.get(f"{base_url}/workspaces", headers=headers)
        if workspaces_response.status_code != 200:
            print(f"❌ Workspaces endpoint failed: {workspaces_response.status_code}")
            return False
            
        workspaces_data = workspaces_response.json()
        workspaces = workspaces_data.get("workspaces", [])
        if not workspaces:
            print("❌ No workspaces found")
            return False
            
        workspace_id = workspaces[0]["id"]
        print(f"✅ Using workspace: {workspace_id}")
        
    except Exception as e:
        print(f"❌ Workspaces error: {e}")
        return False
    
    # Step 4: Test message sending (this should trigger agent responses)
    print("\n💬 Step 4: Testing message sending...")
    try:
        message_data = {
            "content": "Hello, can you help me with strategic analysis?"
        }
        
        message_response = requests.post(
            f"{base_url}/workspaces/{workspace_id}/messages", 
            json=message_data, 
            headers=headers
        )
        
        if message_response.status_code != 201:
            print(f"❌ Message sending failed: {message_response.status_code}")
            print(f"Response: {message_response.text}")
            return False
            
        messages = message_response.json()
        print(f"✅ Received {len(messages)} messages")
        
        # Analyze the messages
        human_messages = [m for m in messages if m.get("type") == "human"]
        ai_messages = [m for m in messages if m.get("type") == "ai"]
        
        print(f"  - Human messages: {len(human_messages)}")
        print(f"  - AI messages: {len(ai_messages)}")
        
        if len(ai_messages) == 0:
            print("❌ CRITICAL: No AI responses generated!")
            print("This confirms the agent response issue.")
            return False
        else:
            print("✅ AI responses generated successfully")
            for ai_msg in ai_messages:
                print(f"  - AI ({ai_msg.get('author', 'Unknown')}): {ai_msg.get('content', '')[:100]}...")
                
    except Exception as e:
        print(f"❌ Message sending error: {e}")
        return False
    
    print("\n✅ SUCCESS: All agent API tests passed!")
    return True

if __name__ == "__main__":
    success = test_agent_api_with_auth()
    sys.exit(0 if success else 1)