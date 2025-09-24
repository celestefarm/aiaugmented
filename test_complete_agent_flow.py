#!/usr/bin/env python3

import requests
import json
import sys

def test_complete_agent_flow():
    """Test complete agent flow: login -> create workspace -> send message -> get AI response"""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("🧪 Testing Complete Agent Flow")
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
    
    # Step 2: Create a workspace
    print("\n🏢 Step 2: Creating workspace...")
    try:
        workspace_data = {
            "title": "Test Workspace for Agent Response",
            "settings": {
                "active_agents": ["strategist"]  # Activate strategist agent
            }
        }
        
        workspace_response = requests.post(f"{base_url}/workspaces", json=workspace_data, headers=headers)
        if workspace_response.status_code != 201:
            print(f"❌ Workspace creation failed: {workspace_response.status_code}")
            print(f"Response: {workspace_response.text}")
            return False
            
        workspace = workspace_response.json()
        workspace_id = workspace["id"]
        print(f"✅ Created workspace: {workspace_id}")
        
    except Exception as e:
        print(f"❌ Workspace creation error: {e}")
        return False
    
    # Step 3: Test message sending (this should trigger agent responses)
    print("\n💬 Step 3: Testing message sending with agent response...")
    try:
        message_data = {
            "content": "Hello, I need help with strategic planning for my startup. Can you guide me through the process?"
        }
        
        print(f"Sending message to workspace: {workspace_id}")
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
            print("The agent response issue is still present.")
            
            # Show all messages for debugging
            print("\n🔍 Debug: All messages received:")
            for i, msg in enumerate(messages):
                print(f"  Message {i+1}:")
                print(f"    Type: {msg.get('type')}")
                print(f"    Author: {msg.get('author')}")
                print(f"    Content: {msg.get('content', '')[:100]}...")
                print()
            
            return False
        else:
            print("🎉 SUCCESS: AI responses generated!")
            for ai_msg in ai_messages:
                print(f"  ✅ AI ({ai_msg.get('author', 'Unknown')}): {ai_msg.get('content', '')[:150]}...")
                
    except Exception as e:
        print(f"❌ Message sending error: {e}")
        return False
    
    print("\n🎉 SUCCESS: Complete agent flow working!")
    print("✅ Agents are now responding to messages in the chat interface!")
    return True

if __name__ == "__main__":
    success = test_complete_agent_flow()
    sys.exit(0 if success else 1)