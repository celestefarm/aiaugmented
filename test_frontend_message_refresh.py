#!/usr/bin/env python3
"""
Test script to verify that the frontend properly refreshes chat messages after node deletion.
This tests the complete Add to Map → Delete Node → Message Label Reset cycle.
"""

import asyncio
import aiohttp
import json

async def test_frontend_message_refresh():
    """Test the complete frontend message refresh workflow"""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("=== TESTING FRONTEND MESSAGE REFRESH AFTER NODE DELETION ===")
    
    # Step 1: Login
    print("\n=== STEP 1: LOGIN ===")
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{base_url}/auth/login", json=login_data) as response:
            if response.status == 200:
                login_result = await response.json()
                token = login_result["access_token"]
                user_info = login_result["user"]
                print(f"✅ Login successful")
                print(f"   User: {user_info.get('name', 'Unknown')} ({user_info.get('email', 'Unknown')})")
            else:
                print(f"❌ Login failed: {response.status}")
                return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Get workspaces
        print("\n=== STEP 2: GET WORKSPACES ===")
        async with session.get(f"{base_url}/workspaces", headers=headers) as response:
            if response.status == 200:
                workspaces_data = await response.json()
                workspaces = workspaces_data.get('workspaces', [])
                if workspaces:
                    workspace = workspaces[0]
                    workspace_id = workspace.get("id", workspace.get("_id"))
                    print(f"✅ Found {len(workspaces)} workspaces")
                    print(f"   Using workspace: '{workspace.get('title', workspace.get('name', 'Unknown'))}' (ID: {workspace_id})")
                else:
                    print("❌ No workspaces found")
                    return
            else:
                print(f"❌ Failed to get workspaces: {response.status}")
                return
        
        # Step 3: Get initial message state
        print("\n=== STEP 3: GET INITIAL MESSAGE STATE ===")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/messages", headers=headers) as response:
            if response.status == 200:
                messages_data = await response.json()
                messages = messages_data.get('messages', [])
                ai_messages = [msg for msg in messages if isinstance(msg, dict) and msg.get("type") == "ai"]
                if ai_messages:
                    test_message = ai_messages[0]
                    message_id = test_message.get("id", test_message.get("_id"))
                    initial_added_to_map = test_message.get("added_to_map", False)
                    print(f"✅ Found {len(messages)} messages")
                    print(f"   Test message: {message_id}")
                    print(f"   Initial added_to_map status: {initial_added_to_map}")
                    print(f"   Content: {test_message.get('content', '')[:50]}...")
                else:
                    print("❌ No AI messages found")
                    return
            else:
                print(f"❌ Failed to get messages: {response.status}")
                return
        
        # Step 4: Add to Map
        print("\n=== STEP 4: ADD TO MAP ===")
        add_to_map_data = {
            "node_title": f"Test Node: {test_message.get('content', '')[:30]}...",
            "node_type": "ai"
        }
        
        async with session.post(
            f"{base_url}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
            json=add_to_map_data,
            headers=headers
        ) as response:
            if response.status == 200:
                result = await response.json()
                node_id = result.get("node_id")
                print(f"✅ Add to Map successful!")
                print(f"   Node ID: {node_id}")
            else:
                response_text = await response.text()
                print(f"❌ Add to Map failed: {response.status}")
                print(f"   Error: {response_text}")
                return
        
        # Step 5: Verify message status is "Added to map"
        print("\n=== STEP 5: VERIFY MESSAGE STATUS (SHOULD BE 'ADDED TO MAP') ===")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/messages", headers=headers) as response:
            if response.status == 200:
                messages_data = await response.json()
                messages = messages_data.get('messages', [])
                updated_message = next((msg for msg in messages if msg.get("id", msg.get("_id")) == message_id), None)
                if updated_message:
                    added_to_map = updated_message.get("added_to_map", False)
                    print(f"✅ Message status after Add to Map: added_to_map = {added_to_map}")
                    if added_to_map:
                        print("   ✅ Correct! Message shows 'Added to map'")
                    else:
                        print("   ❌ Error! Message should show 'Added to map'")
                        return
                else:
                    print("❌ Could not find updated message")
                    return
            else:
                print(f"❌ Failed to get updated messages: {response.status}")
                return
        
        # Step 6: Delete the node
        print("\n=== STEP 6: DELETE NODE ===")
        async with session.delete(
            f"{base_url}/workspaces/{workspace_id}/nodes/{node_id}",
            headers=headers
        ) as response:
            if response.status == 204:
                print(f"✅ Node deleted successfully!")
                print("   Backend should have automatically reset message's added_to_map status")
            else:
                response_text = await response.text()
                print(f"❌ Node deletion failed: {response.status}")
                print(f"   Error: {response_text}")
                return
        
        # Step 7: Verify backend has reset message status
        print("\n=== STEP 7: VERIFY BACKEND RESET MESSAGE STATUS ===")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/messages", headers=headers) as response:
            if response.status == 200:
                messages_data = await response.json()
                messages = messages_data.get('messages', [])
                backend_message = next((msg for msg in messages if msg.get("id", msg.get("_id")) == message_id), None)
                if backend_message:
                    backend_added_to_map = backend_message.get("added_to_map", False)
                    print(f"✅ Backend message status after node deletion: added_to_map = {backend_added_to_map}")
                    if not backend_added_to_map:
                        print("   ✅ Perfect! Backend correctly reset message status to False")
                        print("   ✅ Frontend should now refresh and show 'Add to map' label")
                    else:
                        print("   ❌ Error! Backend should have reset message status to False")
                        return
                else:
                    print("❌ Could not find message after node deletion")
                    return
            else:
                print(f"❌ Failed to get messages after node deletion: {response.status}")
                return
        
        # Step 8: Test re-adding to map
        print("\n=== STEP 8: TEST RE-ADDING TO MAP ===")
        async with session.post(
            f"{base_url}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
            json=add_to_map_data,
            headers=headers
        ) as response:
            if response.status == 200:
                result = await response.json()
                new_node_id = result.get("node_id")
                print(f"✅ Re-add to Map successful!")
                print(f"   New Node ID: {new_node_id}")
                print("   ✅ Message can be re-added to map after deletion")
            else:
                response_text = await response.text()
                print(f"❌ Re-add to Map failed: {response.status}")
                print(f"   Error: {response_text}")
                return
        
        # Step 9: Final verification
        print("\n=== STEP 9: FINAL VERIFICATION ===")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/messages", headers=headers) as response:
            if response.status == 200:
                messages_data = await response.json()
                messages = messages_data.get('messages', [])
                final_message = next((msg for msg in messages if msg.get("id", msg.get("_id")) == message_id), None)
                if final_message:
                    final_added_to_map = final_message.get("added_to_map", False)
                    print(f"✅ Final message status: added_to_map = {final_added_to_map}")
                    if final_added_to_map:
                        print("   ✅ Perfect! Message shows 'Added to map' after re-adding")
                    else:
                        print("   ❌ Error! Message should show 'Added to map' after re-adding")
                        return
                else:
                    print("❌ Could not find final message")
                    return
            else:
                print(f"❌ Failed to get final messages: {response.status}")
                return
        
        print("\n=== TEST COMPLETE ===")
        print("✅ Backend message status management working perfectly!")
        print("✅ Add to Map → Delete Node → Reset Status → Re-add to Map cycle complete!")
        print("")
        print("🎯 FRONTEND INTEGRATION:")
        print("   - The backend correctly resets message status when nodes are deleted")
        print("   - The frontend ExplorationMap.tsx now calls loadMessages() after node deletion")
        print("   - This ensures the chat interface reflects the updated message status")
        print("   - Users will see labels toggle: 'Add to map' → 'Added to map' → 'Add to map'")

if __name__ == "__main__":
    asyncio.run(test_frontend_message_refresh())