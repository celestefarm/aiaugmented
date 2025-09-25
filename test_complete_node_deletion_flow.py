#!/usr/bin/env python3
"""
Complete Node Deletion Flow Test
Tests the entire node deletion flow including UI state updates
"""

import asyncio
import aiohttp
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

async def test_complete_node_deletion_flow():
    """Test the complete node deletion flow including message state reversion"""
    
    print("🔍 [COMPLETE FLOW TEST] Testing complete node deletion flow...")
    print(f"API Base URL: {API_BASE_URL}")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Create a new user
            print("\n1️⃣ [SETUP] Creating test user and workspace...")
            signup_data = {
                "email": f"test-complete-{int(asyncio.get_event_loop().time())}@example.com",
                "password": "testpass123",
                "name": "Complete Test User"
            }
            
            async with session.post(f"{API_BASE_URL}/auth/signup", json=signup_data) as response:
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    print(f"❌ Signup failed: {response.status} - {error_text}")
                    return
                
                signup_result = await response.json()
                token = signup_result["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                print(f"✅ User created successfully")
            
            # Step 2: Create workspace
            workspace_data = {
                "title": "Complete Node Deletion Test Workspace",
                "settings": {},
                "transform": {"x": 0, "y": 0, "scale": 1}
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces", json=workspace_data, headers=headers) as response:
                if response.status != 201:
                    error_text = await response.text()
                    print(f"❌ Workspace creation failed: {response.status} - {error_text}")
                    return
                
                workspace = await response.json()
                workspace_id = workspace["id"]
                print(f"✅ Workspace created: {workspace_id}")
            
            # Step 3: Send a message to create AI response
            print("\n2️⃣ [MESSAGE CREATION] Creating AI message...")
            message_data = {
                "content": "What are the key strategic considerations for launching a new product?"
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", 
                                  json=message_data, headers=headers) as response:
                if response.status != 201:
                    error_text = await response.text()
                    print(f"❌ Message creation failed: {response.status} - {error_text}")
                    return
                
                messages = await response.json()
                ai_message = None
                for msg in messages:
                    if msg["type"] == "ai":
                        ai_message = msg
                        break
                
                if not ai_message:
                    print("❌ No AI message found in response")
                    return
                
                message_id = ai_message["id"]
                print(f"✅ AI message created: {message_id}")
                print(f"   Content preview: {ai_message['content'][:50]}...")
                print(f"   Added to map: {ai_message['added_to_map']}")
            
            # Step 4: Add message to map
            print("\n3️⃣ [ADD TO MAP] Adding message to map...")
            add_to_map_data = {
                "node_title": "Strategic Product Launch Considerations",
                "node_type": "ai"
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces/{workspace_id}/messages/{message_id}/add-to-map", 
                                  json=add_to_map_data, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Add to map failed: {response.status} - {error_text}")
                    return
                
                add_result = await response.json()
                if not add_result["success"]:
                    print(f"❌ Add to map failed: {add_result['message']}")
                    return
                
                node_id = add_result["node_id"]
                print(f"✅ Message added to map successfully: {node_id}")
            
            # Step 5: Verify message state changed
            print("\n4️⃣ [VERIFICATION] Verifying message state...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to get messages: {response.status} - {error_text}")
                    return
                
                messages_result = await response.json()
                updated_message = None
                for msg in messages_result["messages"]:
                    if msg["id"] == message_id:
                        updated_message = msg
                        break
                
                if not updated_message:
                    print("❌ Message not found after add to map")
                    return
                
                print(f"✅ Message state verified:")
                print(f"   Added to map: {updated_message['added_to_map']}")
                
                if not updated_message['added_to_map']:
                    print("❌ Message should be marked as added to map")
                    return
            
            # Step 6: Verify node exists
            print("\n5️⃣ [NODE VERIFICATION] Verifying node exists...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to get nodes: {response.status} - {error_text}")
                    return
                
                nodes_result = await response.json()
                target_node = None
                for node in nodes_result["nodes"]:
                    if node["id"] == node_id:
                        target_node = node
                        break
                
                if not target_node:
                    print("❌ Node not found after creation")
                    return
                
                print(f"✅ Node verified:")
                print(f"   ID: {target_node['id']}")
                print(f"   Title: {target_node['title']}")
                print(f"   Source agent: {target_node.get('source_agent', 'None')}")
            
            # Step 7: Test node deletion
            print("\n6️⃣ [NODE DELETION] Testing node deletion...")
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", 
                                    headers=headers) as response:
                print(f"📡 DELETE Response Status: {response.status}")
                
                if response.status == 204:
                    print("✅ Node deletion successful (204 No Content)")
                else:
                    error_text = await response.text()
                    print(f"❌ Node deletion failed: {response.status} - {error_text}")
                    return
            
            # Step 8: Verify node is deleted
            print("\n7️⃣ [DELETION VERIFICATION] Verifying node is deleted...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as response:
                if response.status == 200:
                    nodes_result = await response.json()
                    node_still_exists = any(n["id"] == node_id for n in nodes_result["nodes"])
                    
                    if node_still_exists:
                        print("❌ Node still exists after deletion")
                        return
                    else:
                        print("✅ Node successfully deleted from canvas")
                else:
                    print(f"❌ Failed to verify node deletion: {response.status}")
                    return
            
            # Step 9: Verify message state reverted
            print("\n8️⃣ [MESSAGE STATE VERIFICATION] Verifying message state reverted...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to get messages: {response.status} - {error_text}")
                    return
                
                messages_result = await response.json()
                final_message = None
                for msg in messages_result["messages"]:
                    if msg["id"] == message_id:
                        final_message = msg
                        break
                
                if not final_message:
                    print("❌ Message not found after node deletion")
                    return
                
                print(f"✅ Final message state:")
                print(f"   Added to map: {final_message['added_to_map']}")
                
                if final_message['added_to_map']:
                    print("❌ ISSUE: Message should be reverted to 'added_to_map: false'")
                    print("❌ This means the UI will still show 'Added to map' instead of 'Add to map'")
                    return
                else:
                    print("✅ SUCCESS: Message state correctly reverted to 'added_to_map: false'")
                    print("✅ UI should now show 'Add to map' button")
            
            print("\n" + "=" * 60)
            print("🎉 [COMPLETE FLOW TEST SUCCESS]")
            print("✅ Node deletion works correctly")
            print("✅ Message state properly reverted")
            print("✅ UI should toggle from 'Added to map' back to 'Add to map'")
            print("✅ The complete flow is working as expected!")
            
        except Exception as e:
            print(f"💥 [TEST ERROR] Unexpected error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_complete_node_deletion_flow())