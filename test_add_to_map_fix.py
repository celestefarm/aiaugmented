#!/usr/bin/env python3
"""
Test script to verify the "Add to Map" fix works correctly.
This script simulates the exact workflow that was failing.
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_EMAIL = "celeste.fcp@gmail.com"
TEST_PASSWORD = "celeste060291"

async def test_add_to_map_fix():
    """Test the complete add-to-map workflow"""
    
    print("🧪 Testing Add to Map Fix")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Login
            print("1. Logging in...")
            login_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            
            async with session.post(f"{BASE_URL}/api/v1/auth/login", json=login_data) as response:
                if response.status != 200:
                    print(f"❌ Login failed: {response.status}")
                    return False
                
                login_result = await response.json()
                token = login_result["access_token"]
                print(f"✅ Login successful")
            
            # Set authorization header
            headers = {"Authorization": f"Bearer {token}"}
            
            # Step 2: Create a workspace
            print("2. Creating workspace...")
            workspace_data = {
                "title": f"Test Workspace {datetime.now().strftime('%H:%M:%S')}"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/workspaces", json=workspace_data, headers=headers) as response:
                if response.status != 201:
                    print(f"❌ Workspace creation failed: {response.status}")
                    return False
                
                workspace = await response.json()
                workspace_id = workspace["id"]
                print(f"✅ Workspace created: {workspace_id}")
            
            # Step 3: Send a message to create AI response
            print("3. Sending message to get AI response...")
            message_data = {
                "content": "What are the key strategic considerations for launching a new product?"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/workspaces/{workspace_id}/messages", json=message_data, headers=headers) as response:
                if response.status != 201:
                    print(f"❌ Message sending failed: {response.status}")
                    return False
                
                messages = await response.json()
                # Find the AI message (should be the second message)
                ai_message = None
                for msg in messages:
                    if msg["type"] == "ai":
                        ai_message = msg
                        break
                
                if not ai_message:
                    print("❌ No AI message found")
                    return False
                
                message_id = ai_message["id"]
                print(f"✅ AI message created: {message_id}")
                print(f"   Content preview: {ai_message['content'][:100]}...")
            
            # Step 4: Add message to map (this was failing before)
            print("4. Adding message to map...")
            add_to_map_data = {
                "node_title": "Strategic Product Launch Considerations",
                "node_type": "ai"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/workspaces/{workspace_id}/messages/{message_id}/add-to-map", json=add_to_map_data, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Add to map failed: {response.status}")
                    print(f"   Error: {error_text}")
                    return False
                
                result = await response.json()
                if result["success"]:
                    print(f"✅ Message successfully added to map!")
                    print(f"   Node ID: {result['node_id']}")
                    print(f"   Message: {result['message']}")
                else:
                    print(f"❌ Add to map returned success=False")
                    return False
            
            # Step 5: Verify the node was created
            print("5. Verifying node creation...")
            async with session.get(f"{BASE_URL}/api/v1/workspaces/{workspace_id}/nodes", headers=headers) as response:
                if response.status != 200:
                    print(f"❌ Node verification failed: {response.status}")
                    return False
                
                nodes = await response.json()
                if len(nodes) > 0:
                    print(f"✅ Node verified: {len(nodes)} node(s) found")
                    for node in nodes:
                        print(f"   - {node['title']} at ({node['x']}, {node['y']})")
                else:
                    print("❌ No nodes found after creation")
                    return False
            
            print("\n🎉 ALL TESTS PASSED! Add to Map fix is working correctly.")
            return True
            
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_add_to_map_fix())
    if success:
        print("\n✅ Fix verification completed successfully!")
    else:
        print("\n❌ Fix verification failed!")