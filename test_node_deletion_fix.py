#!/usr/bin/env python3
"""
Test the node deletion fix with the corrected workspace_id consistency
"""

import requests
import json

def test_node_deletion_fix():
    """Test that node deletion now works correctly"""
    
    print("🧪 Testing Node Deletion Fix")
    print("=" * 50)
    
    BASE_URL = "http://localhost:8000/api/v1"
    
    # Test credentials (from backend seeding)
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "password123"
    }
    
    try:
        # Step 1: Login
        print("1️⃣ Logging in...")
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
            
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
        # Step 2: Get workspaces
        print("2️⃣ Getting workspaces...")
        workspaces_response = requests.get(f"{BASE_URL}/workspaces", headers=headers)
        if workspaces_response.status_code != 200:
            print(f"❌ Failed to get workspaces: {workspaces_response.status_code}")
            return False
            
        workspaces = workspaces_response.json()
        if not workspaces:
            print("❌ No workspaces found")
            return False
            
        workspace_id = workspaces[0]["id"]
        print(f"✅ Using workspace: {workspace_id}")
        
        # Step 3: Create a test node
        print("3️⃣ Creating test node...")
        node_data = {
            "title": "Test Node for Deletion",
            "description": "This node will be deleted to test the fix",
            "type": "human",
            "x": 100,
            "y": 100
        }
        
        create_response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/nodes",
            json=node_data,
            headers=headers
        )
        
        if create_response.status_code != 201:
            print(f"❌ Failed to create node: {create_response.status_code}")
            print(f"Response: {create_response.text}")
            return False
            
        node = create_response.json()
        node_id = node["id"]
        print(f"✅ Created test node: {node_id}")
        
        # Step 4: Test node deletion
        print("4️⃣ Testing node deletion...")
        delete_response = requests.delete(
            f"{BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}",
            headers=headers
        )
        
        if delete_response.status_code == 204:
            print("✅ Node deletion successful!")
            print("🎉 The workspace_id consistency fix is working!")
            return True
        else:
            print(f"❌ Node deletion failed: {delete_response.status_code}")
            print(f"Response: {delete_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def test_add_to_map_flow():
    """Test the complete add-to-map and remove-from-map flow"""
    
    print("\n🔄 Testing Add-to-Map Flow")
    print("=" * 50)
    
    BASE_URL = "http://localhost:8000/api/v1"
    
    # Test credentials
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "password123"
    }
    
    try:
        # Login
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get workspace
        workspaces_response = requests.get(f"{BASE_URL}/workspaces", headers=headers)
        workspace_id = workspaces_response.json()[0]["id"]
        
        # Get messages
        print("1️⃣ Getting messages...")
        messages_response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/messages", headers=headers)
        if messages_response.status_code != 200:
            print(f"❌ Failed to get messages: {messages_response.status_code}")
            return False
            
        messages = messages_response.json()["messages"]
        if not messages:
            print("❌ No messages found")
            return False
            
        # Find an AI message to test with
        ai_message = None
        for msg in messages:
            if msg["type"] == "ai" and not msg["added_to_map"]:
                ai_message = msg
                break
                
        if not ai_message:
            print("❌ No available AI message to test with")
            return False
            
        message_id = ai_message["id"]
        print(f"✅ Using AI message: {message_id}")
        
        # Step 2: Add message to map
        print("2️⃣ Adding message to map...")
        add_response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
            json={"node_title": "Test Add-to-Map Node", "node_type": "ai"},
            headers=headers
        )
        
        if add_response.status_code != 200:
            print(f"❌ Failed to add to map: {add_response.status_code}")
            print(f"Response: {add_response.text}")
            return False
            
        add_result = add_response.json()
        if not add_result["success"]:
            print(f"❌ Add to map failed: {add_result['message']}")
            return False
            
        node_id = add_result["node_id"]
        print(f"✅ Added to map successfully: {node_id}")
        
        # Step 3: Test remove from map
        print("3️⃣ Testing remove from map...")
        remove_response = requests.post(
            f"{BASE_URL}/workspaces/{workspace_id}/messages/remove-from-map",
            json={"node_id": node_id},
            headers=headers
        )
        
        if remove_response.status_code == 200:
            remove_result = remove_response.json()
            if remove_result["success"]:
                print("✅ Remove from map successful!")
                print("🎉 The complete add/remove toggle flow is working!")
                return True
            else:
                print(f"❌ Remove from map failed: {remove_result['message']}")
                return False
        else:
            print(f"❌ Remove from map request failed: {remove_response.status_code}")
            print(f"Response: {remove_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Node Deletion and Add-to-Map Fixes")
    print()
    
    success1 = test_node_deletion_fix()
    success2 = test_add_to_map_flow()
    
    print("\n" + "=" * 60)
    if success1 and success2:
        print("🎊 ALL TESTS PASSED!")
        print("✅ Node deletion fix is working")
        print("✅ Add-to-map toggle fix is working")
        print("🌐 The frontend should now work correctly!")
    else:
        print("❌ SOME TESTS FAILED!")
        if not success1:
            print("❌ Node deletion still has issues")
        if not success2:
            print("❌ Add-to-map toggle still has issues")
    print("=" * 60)