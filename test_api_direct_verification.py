#!/usr/bin/env python3
"""
Direct API verification test for node deletion and add-to-map functionality
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/v1"

def test_health():
    """Test if the API server is running"""
    try:
        response = requests.get(f"{BASE_URL}/healthz")
        print(f"✅ Health check: {response.status_code}")
        if response.status_code == 200:
            health_data = response.json()
            print(f"   Status: {health_data.get('status')}")
            print(f"   Database: {health_data.get('database', {}).get('connected')}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_signup_and_login():
    """Test user signup and login"""
    try:
        # Test login with existing user
        login_data = {
            "email": "celeste.fcp@gmail.com",
            "password": "celeste060291"
        }
        
        print("🔄 Testing login...")
        login_response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login response: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            print(f"✅ Login successful")
            return token_data.get("access_token")
        else:
            print(f"❌ Login failed: {login_response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Auth test failed: {e}")
        return None

def test_workspace_creation(token):
    """Test workspace creation"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        workspace_data = {
            "title": "Test Workspace",
            "description": "Test workspace for API verification"
        }
        
        print("🔄 Testing workspace creation...")
        response = requests.post(f"{BASE_URL}/workspaces", json=workspace_data, headers=headers)
        print(f"Workspace creation response: {response.status_code}")
        
        if response.status_code in [200, 201]:
            workspace = response.json()
            print(f"✅ Workspace created: {workspace.get('id')}")
            return workspace.get("id")
        else:
            print(f"❌ Workspace creation failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Workspace creation failed: {e}")
        return None

def test_node_operations(token, workspace_id):
    """Test node creation and deletion"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a test node
        node_data = {
            "title": "Test Node",
            "description": "Test node for deletion",
            "type": "human",
            "x": 100,
            "y": 100
        }
        
        print("🔄 Testing node creation...")
        create_response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/nodes", json=node_data, headers=headers)
        print(f"Node creation response: {create_response.status_code}")
        
        if create_response.status_code in [200, 201]:
            node = create_response.json()
            node_id = node.get("id")
            print(f"✅ Node created: {node_id}")
            
            # Test node deletion
            print("🔄 Testing node deletion...")
            delete_response = requests.delete(f"{BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", headers=headers)
            print(f"Node deletion response: {delete_response.status_code}")
            
            if delete_response.status_code in [200, 204]:
                print(f"✅ Node deleted successfully")
                return True
            else:
                print(f"❌ Node deletion failed: {delete_response.text}")
                return False
        else:
            print(f"❌ Node creation failed: {create_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Node operations failed: {e}")
        return False

def test_message_operations(token, workspace_id):
    """Test message operations"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create a test message
        message_data = {
            "content": "Test message for add-to-map",
            "message_type": "human",
            "author": "Test User"
        }
        
        print("🔄 Testing message creation...")
        create_response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/messages", json=message_data, headers=headers)
        print(f"Message creation response: {create_response.status_code}")
        
        if create_response.status_code in [200, 201]:
            messages = create_response.json()
            if isinstance(messages, list) and len(messages) > 0:
                message = messages[0]  # Get the first message from the list
                message_id = message.get("id")
                print(f"✅ Message created: {message_id}")
            else:
                print(f"❌ Unexpected message response format: {messages}")
                return False
            
            # Test add-to-map
            add_to_map_data = {
                "message_id": message_id,
                "x": 200,
                "y": 200
            }
            
            print("🔄 Testing add-to-map...")
            add_response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/messages/add-to-map", json=add_to_map_data, headers=headers)
            print(f"Add-to-map response: {add_response.status_code}")
            
            if add_response.status_code in [200, 201]:
                print(f"✅ Add-to-map successful")
                
                # Test remove-from-map
                remove_data = {
                    "message_id": message_id
                }
                
                print("🔄 Testing remove-from-map...")
                remove_response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/messages/remove-from-map", json=remove_data, headers=headers)
                print(f"Remove-from-map response: {remove_response.status_code}")
                
                if remove_response.status_code in [200, 204]:
                    print(f"✅ Remove-from-map successful")
                    return True
                else:
                    print(f"❌ Remove-from-map failed: {remove_response.text}")
                    return False
            else:
                print(f"❌ Add-to-map failed: {add_response.text}")
                return False
        else:
            print(f"❌ Message creation failed: {create_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Message operations failed: {e}")
        return False

def main():
    """Main test function"""
    print("🔄 Starting API Direct Verification Test")
    print("=" * 50)
    
    # Test 1: Health check
    if not test_health():
        print("❌ Server is not running or not responding")
        sys.exit(1)
    
    # Test 2: Authentication
    token = test_signup_and_login()
    if not token:
        print("❌ Authentication failed")
        sys.exit(1)
    
    # Test 3: Workspace creation
    workspace_id = test_workspace_creation(token)
    if not workspace_id:
        print("❌ Workspace creation failed")
        sys.exit(1)
    
    # Test 4: Node operations
    node_success = test_node_operations(token, workspace_id)
    
    # Test 5: Message operations
    message_success = test_message_operations(token, workspace_id)
    
    print("\n" + "=" * 50)
    print("🔄 Test Results Summary")
    print("=" * 50)
    print(f"✅ Health check: PASSED")
    print(f"✅ Authentication: PASSED")
    print(f"✅ Workspace creation: PASSED")
    print(f"{'✅' if node_success else '❌'} Node operations: {'PASSED' if node_success else 'FAILED'}")
    print(f"{'✅' if message_success else '❌'} Message operations: {'PASSED' if message_success else 'FAILED'}")
    
    if node_success and message_success:
        print("\n🎉 ALL TESTS PASSED! The add-to-map toggle should work correctly.")
    else:
        print("\n❌ SOME TESTS FAILED! Issues need to be resolved.")
        sys.exit(1)

if __name__ == "__main__":
    main()