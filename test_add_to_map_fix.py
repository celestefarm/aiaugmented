#!/usr/bin/env python3
"""
Test script to verify the "Add to Map" functionality fix.
This script will:
1. Create a test workspace
2. Send a message to get an AI response
3. Try to add the AI response to the map
4. Verify a node is created successfully
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "celeste.fcp@gmail.com"
TEST_PASSWORD = "celeste060291"

async def test_add_to_map_fix():
    """Test the complete Add to Map flow"""
    
    async with aiohttp.ClientSession() as session:
        print("🧪 Testing Add to Map Fix")
        print("=" * 50)
        
        # Step 1: Login
        print("1. Logging in...")
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        async with session.post(f"{BASE_URL}/auth/login", json=login_data) as response:
            if response.status != 200:
                print(f"❌ Login failed: {response.status}")
                return False
            
            login_result = await response.json()
            token = login_result["access_token"]
            print(f"✅ Login successful")
        
        # Set authorization header for subsequent requests
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Create a test workspace
        print("\n2. Creating test workspace...")
        workspace_data = {
            "title": f"Add to Map Test - {datetime.now().strftime('%H:%M:%S')}"
        }
        
        async with session.post(f"{BASE_URL}/workspaces", json=workspace_data, headers=headers) as response:
            if response.status != 201:
                print(f"❌ Workspace creation failed: {response.status}")
                return False
            
            workspace_result = await response.json()
            workspace_id = workspace_result["id"]
            print(f"✅ Workspace created: {workspace_id}")
        
        # Step 3: Send a message to get an AI response
        print("\n3. Sending message to get AI response...")
        message_data = {
            "content": "What are the key strategic considerations for a new product launch?"
        }
        
        async with session.post(f"{BASE_URL}/workspaces/{workspace_id}/messages", json=message_data, headers=headers) as response:
            if response.status != 201:
                print(f"❌ Message sending failed: {response.status}")
                return False
            
            messages_result = await response.json()
            print(f"✅ Messages created: {len(messages_result)} messages")
            
            # Find the AI response message
            ai_message = None
            for msg in messages_result:
                if msg["type"] == "ai":
                    ai_message = msg
                    break
            
            if not ai_message:
                print("❌ No AI message found in response")
                return False
            
            ai_message_id = ai_message["id"]
            print(f"✅ AI message found: {ai_message_id}")
            print(f"   Content preview: {ai_message['content'][:100]}...")
        
        # Step 4: Try to add the AI message to the map
        print("\n4. Adding AI message to map...")
        add_to_map_data = {
            "node_title": "Strategic Product Launch Considerations",
            "node_type": "ai"
        }
        
        async with session.post(f"{BASE_URL}/workspaces/{workspace_id}/messages/{ai_message_id}/add-to-map", 
                               json=add_to_map_data, headers=headers) as response:
            response_text = await response.text()
            
            if response.status == 200:
                add_result = json.loads(response_text)
                if add_result.get("success"):
                    node_id = add_result.get("node_id")
                    print(f"✅ Message successfully added to map!")
                    print(f"   Node ID: {node_id}")
                    print(f"   Message: {add_result.get('message')}")
                else:
                    print(f"❌ Add to map failed: {add_result}")
                    return False
            else:
                print(f"❌ Add to map API call failed: {response.status}")
                print(f"   Response: {response_text}")
                return False
        
        # Step 5: Verify the node was created by checking the nodes endpoint
        print("\n5. Verifying node was created...")
        async with session.get(f"{BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as response:
            if response.status != 200:
                print(f"❌ Failed to fetch nodes: {response.status}")
                return False
            
            nodes_result = await response.json()
            nodes = nodes_result.get("nodes", [])
            print(f"✅ Found {len(nodes)} nodes in workspace")
            
            if len(nodes) > 0:
                for i, node in enumerate(nodes):
                    print(f"   Node {i+1}: {node.get('title', 'No title')}")
                    print(f"            Type: {node.get('type', 'No type')}")
                    print(f"            Position: ({node.get('x', 0)}, {node.get('y', 0)})")
                return True
            else:
                print("❌ No nodes found - the fix may not be working")
                return False

if __name__ == "__main__":
    try:
        result = asyncio.run(test_add_to_map_fix())
        if result:
            print("\n🎉 SUCCESS: Add to Map functionality is working correctly!")
        else:
            print("\n💥 FAILURE: Add to Map functionality is still broken")
    except Exception as e:
        print(f"\n💥 ERROR: {e}")