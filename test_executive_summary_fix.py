#!/usr/bin/env python3
"""
Test script to verify the AI executive summary functionality is working after the fix.
"""

import asyncio
import aiohttp
import json

async def test_executive_summary():
    """Test the complete Add to Map and Executive Summary workflow"""
    
    base_url = "http://localhost:8000/api/v1"
    
    print("=== TESTING EXECUTIVE SUMMARY FUNCTIONALITY ===")
    
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
                print(f"   User ID: {user_info.get('_id', user_info.get('id', 'Unknown'))}")
            else:
                print(f"❌ Login failed: {response.status}")
                return
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Step 2: Get workspaces
        print("\n=== STEP 2: GET WORKSPACES ===")
        async with session.get(f"{base_url}/workspaces", headers=headers) as response:
            if response.status == 200:
                workspaces_data = await response.json()
                print(f"Debug: workspaces response = {workspaces_data}")
                
                # Handle both list and dict responses
                if isinstance(workspaces_data, list):
                    workspaces = workspaces_data
                elif isinstance(workspaces_data, dict) and 'workspaces' in workspaces_data:
                    workspaces = workspaces_data['workspaces']
                else:
                    workspaces = [workspaces_data] if workspaces_data else []
                
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
                print(f"Debug: messages response = {messages_data}")
                
                # Handle both list and dict responses
                if isinstance(messages_data, list):
                    messages = messages_data
                elif isinstance(messages_data, dict) and 'messages' in messages_data:
                    messages = messages_data['messages']
                else:
                    messages = [messages_data] if messages_data else []
                
                ai_messages = [msg for msg in messages if isinstance(msg, dict) and msg.get("type") == "ai" and not msg.get("added_to_map")]
                if ai_messages:
                    test_message = ai_messages[0]
                    message_id = test_message["id"]
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
        
        # Step 4: Add to Map
        print("\n=== STEP 4: ADD TO MAP TEST ===")
        add_to_map_data = {
            "node_title": f"Test Node: {test_message.get('content', '')[:30]}...",
            "node_type": "ai"
        }
        
        async with session.post(
            f"{base_url}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
            json=add_to_map_data,
            headers=headers
        ) as response:
            response_text = await response.text()
            print(f"Response status: {response.status}")
            print(f"Response text: {response_text}")
            
            if response.status == 200:
                result = json.loads(response_text)
                node_id = result.get("node_id")
                print(f"✅ Add to Map successful!")
                print(f"   Success: {result.get('success')}")
                print(f"   Node ID: {node_id}")
                print(f"   Message: {result.get('message')}")
            else:
                print(f"❌ Add to Map failed: {response.status}")
                return
        
        # Step 5: Test Executive Summary
        print("\n=== STEP 5: TEST EXECUTIVE SUMMARY ===")
        summary_request = {
            "node_id": node_id,
            "conversation_context": "Testing executive summary generation",
            "include_related_messages": True
        }
        
        async with session.post(
            f"{base_url}/nodes/{node_id}/executive-summary",
            json=summary_request,
            headers=headers
        ) as response:
            response_text = await response.text()
            print(f"Response status: {response.status}")
            
            if response.status == 200:
                summary_result = json.loads(response_text)
                print(f"✅ Executive Summary generated successfully!")
                print(f"   Executive Summary:")
                for i, point in enumerate(summary_result.get("executive_summary", []), 1):
                    print(f"     {i}. {point}")
                print(f"   Confidence: {summary_result.get('confidence')}%")
                print(f"   Method Used: {summary_result.get('method_used')}")
                print(f"   Sources Analyzed: {summary_result.get('sources_analyzed')}")
                print(f"   Related Messages Count: {summary_result.get('related_messages_count')}")
            else:
                print(f"❌ Executive Summary failed: {response.status}")
                print(f"   Error: {response_text}")
                return
        
        print("\n=== TEST COMPLETE ===")
        print("✅ All functionality working correctly!")

if __name__ == "__main__":
    asyncio.run(test_executive_summary())