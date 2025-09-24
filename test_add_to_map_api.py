#!/usr/bin/env python3
"""
Test Add to Map functionality using the actual backend API
"""

import requests
import json

# API base URL
API_BASE = "http://localhost:8000/api/v1"

def test_add_to_map_api():
    """Test the Add to Map functionality via API calls"""
    
    print("=== ADD TO MAP API TEST ===")
    
    # Step 1: Login to get authentication token
    print("\n=== STEP 1: AUTHENTICATION ===")
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            token = auth_data["access_token"]
            user = auth_data["user"]
            print(f"✅ Login successful")
            print(f"   User: {user['name']} ({user['email']})")
            # Handle both 'id' and '_id' fields for compatibility
            user_id = user.get('id') or user.get('_id')
            print(f"   User ID: {user_id}")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Headers for authenticated requests
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Get workspaces
    print("\n=== STEP 2: GET WORKSPACES ===")
    try:
        response = requests.get(f"{API_BASE}/workspaces", headers=headers)
        if response.status_code == 200:
            workspaces_data = response.json()
            workspaces = workspaces_data["workspaces"]
            print(f"✅ Found {len(workspaces)} workspaces")
            
            if workspaces:
                test_workspace = workspaces[0]
                workspace_id = test_workspace["id"]
                print(f"   Using workspace: '{test_workspace['title']}' (ID: {workspace_id})")
            else:
                print("❌ No workspaces found")
                return
        else:
            print(f"❌ Get workspaces failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Get workspaces error: {e}")
        return
    
    # Step 3: Get messages in the workspace
    print("\n=== STEP 3: GET MESSAGES ===")
    try:
        response = requests.get(f"{API_BASE}/workspaces/{workspace_id}/messages", headers=headers)
        if response.status_code == 200:
            messages_data = response.json()
            messages = messages_data["messages"]
            print(f"✅ Found {len(messages)} messages")
            
            # Find an AI message that hasn't been added to map
            test_message = None
            for msg in messages:
                if msg["type"] == "ai" and not msg.get("added_to_map", False):
                    test_message = msg
                    break
            
            if test_message:
                print(f"   Using message: {test_message['id']}")
                print(f"   Author: {test_message['author']}")
                print(f"   Content: {test_message['content'][:100]}...")
                print(f"   Added to map: {test_message.get('added_to_map', False)}")
            else:
                print("❌ No suitable AI message found for testing")
                return
        else:
            print(f"❌ Get messages failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Get messages error: {e}")
        return
    
    # Step 4: Test Add to Map API
    print("\n=== STEP 4: ADD TO MAP TEST ===")
    message_id = test_message["id"]
    add_to_map_data = {
        "node_title": f"Test Node: {test_message['content'][:30]}...",
        "node_type": "ai"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
            headers=headers,
            json=add_to_map_data
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Add to Map successful!")
            print(f"   Success: {result.get('success', False)}")
            print(f"   Node ID: {result.get('node_id', 'N/A')}")
            print(f"   Message: {result.get('message', 'N/A')}")
        else:
            print(f"❌ Add to Map failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"   Raw error: {response.text}")
            return
    except Exception as e:
        print(f"❌ Add to Map error: {e}")
        return
    
    # Step 5: Verify node was created
    print("\n=== STEP 5: VERIFY NODE CREATION ===")
    try:
        response = requests.get(f"{API_BASE}/workspaces/{workspace_id}/nodes", headers=headers)
        if response.status_code == 200:
            nodes_data = response.json()
            nodes = nodes_data["nodes"]
            print(f"✅ Found {len(nodes)} nodes in workspace")
            
            # Find the newly created node
            for node in nodes:
                if node.get("source_agent") == test_message["author"]:
                    print(f"   ✅ Found created node:")
                    print(f"     ID: {node['id']}")
                    print(f"     Title: {node['title']}")
                    print(f"     Type: {node['type']}")
                    print(f"     Source Agent: {node.get('source_agent', 'N/A')}")
                    print(f"     Position: ({node['x']}, {node['y']})")
                    break
            else:
                print("   ⚠️  Could not find the newly created node")
        else:
            print(f"❌ Get nodes failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Get nodes error: {e}")
    
    # Step 6: Verify message was marked as added to map
    print("\n=== STEP 6: VERIFY MESSAGE UPDATE ===")
    try:
        response = requests.get(f"{API_BASE}/workspaces/{workspace_id}/messages", headers=headers)
        if response.status_code == 200:
            messages_data = response.json()
            messages = messages_data["messages"]
            
            # Find the updated message
            for msg in messages:
                if msg["id"] == message_id:
                    print(f"   ✅ Found updated message:")
                    print(f"     ID: {msg['id']}")
                    print(f"     Added to map: {msg.get('added_to_map', False)}")
                    if msg.get('added_to_map', False):
                        print(f"   ✅ Message correctly marked as added to map!")
                    else:
                        print(f"   ❌ Message NOT marked as added to map")
                    break
            else:
                print("   ❌ Could not find the test message")
        else:
            print(f"❌ Get messages failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Get messages error: {e}")
    
    print("\n=== TEST COMPLETE ===")

if __name__ == "__main__":
    test_add_to_map_api()