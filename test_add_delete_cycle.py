#!/usr/bin/env python3
"""
Test script to verify the complete Add to Map → Delete Node → Add to Map cycle works correctly.
This tests that the message label properly toggles between "Add to map" and "Added to map".
"""

import asyncio
import aiohttp
import json

async def test_add_delete_cycle():
    """Test the complete Add to Map and Delete Node workflow"""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("=== TESTING ADD TO MAP → DELETE NODE → ADD TO MAP CYCLE ===")
    
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
        
        # Step 3: Get messages
        print("\n=== STEP 3: GET MESSAGES ===")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/messages", headers=headers) as response:
            if response.status == 200:
                messages_data = await response.json()
                messages = messages_data.get('messages', [])
                ai_messages = [msg for msg in messages if isinstance(msg, dict) and msg.get("type") == "ai" and not msg.get("added_to_map")]
                if ai_messages:
                    test_message = ai_messages[0]
                    message_id = test_message.get("id", test_message.get("_id"))
                    print(f"✅ Found {len(messages)} messages")
                    print(f"   Using message: {message_id}")
                    print(f"   Author: {test_message.get('author', 'Unknown')}")
                    print(f"   Content: {test_message.get('content', '')[:50]}...")
                    print(f"   Added to map: {test_message.get('added_to_map', False)}")
                else:
                    print("❌ No suitable AI messages found")
                    return
            else:
                print(f"❌ Failed to get messages: {response.status}")
                return
        
        # Step 4: Add to Map (First Time)
        print("\n=== STEP 4: ADD TO MAP (FIRST TIME) ===")
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
                print(f"   Message: {result.get('message')}")
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
                    print(f"✅ Message status: added_to_map = {added_to_map}")
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
            else:
                response_text = await response.text()
                print(f"❌ Node deletion failed: {response.status}")
                print(f"   Error: {response_text}")
                return
        
        # Step 7: Verify message status is back to "Add to map"
        print("\n=== STEP 7: VERIFY MESSAGE STATUS (SHOULD BE 'ADD TO MAP') ===")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/messages", headers=headers) as response:
            if response.status == 200:
                messages_data = await response.json()
                messages = messages_data.get('messages', [])
                final_message = next((msg for msg in messages if msg.get("id", msg.get("_id")) == message_id), None)
                if final_message:
                    added_to_map = final_message.get("added_to_map", False)
                    print(f"✅ Message status: added_to_map = {added_to_map}")
                    if not added_to_map:
                        print("   ✅ Correct! Message shows 'Add to map' again")
                    else:
                        print("   ❌ Error! Message should show 'Add to map' after node deletion")
                        return
                else:
                    print("❌ Could not find final message")
                    return
            else:
                print(f"❌ Failed to get final messages: {response.status}")
                return
        
        # Step 8: Add to Map again (Second Time)
        print("\n=== STEP 8: ADD TO MAP (SECOND TIME) ===")
        async with session.post(
            f"{base_url}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
            json=add_to_map_data,
            headers=headers
        ) as response:
            if response.status == 200:
                result = await response.json()
                new_node_id = result.get("node_id")
                print(f"✅ Add to Map successful again!")
                print(f"   New Node ID: {new_node_id}")
                print(f"   Message: {result.get('message')}")
            else:
                response_text = await response.text()
                print(f"❌ Second Add to Map failed: {response.status}")
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
                    added_to_map = final_message.get("added_to_map", False)
                    print(f"✅ Final message status: added_to_map = {added_to_map}")
                    if added_to_map:
                        print("   ✅ Perfect! Message shows 'Added to map' after second add")
                    else:
                        print("   ❌ Error! Message should show 'Added to map' after second add")
                        return
                else:
                    print("❌ Could not find final message")
                    return
            else:
                print(f"❌ Failed to get final messages: {response.status}")
                return
        
        print("\n=== TEST COMPLETE ===")
        print("✅ All functionality working correctly!")
        print("✅ Add to Map → Delete Node → Add to Map cycle works perfectly!")

if __name__ == "__main__":
    asyncio.run(test_add_delete_cycle())