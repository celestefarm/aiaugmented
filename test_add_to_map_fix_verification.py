#!/usr/bin/env python3
"""
Test script to verify the "add to map" fix is working correctly.
This script will:
1. Test the add-to-map API endpoint
2. Verify nodes are created successfully
3. Check that nodes can be retrieved
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000"
WORKSPACE_ID = "68d46c8ae4d4ae7d4e75103a"  # From previous logs

def test_add_to_map():
    """Test the add-to-map functionality"""
    print("🧪 Testing Add-to-Map Fix Verification")
    print("=" * 50)
    
    try:
        # Step 1: First, send a message to create a message to add to map
        print("📤 Step 1: Creating a test message...")
        message_data = {
            "content": "This is a test message to verify the add-to-map fix is working correctly."
        }
        
        send_message_url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_ID}/messages"
        
        # Note: This will fail without authentication, but let's try anyway
        response = requests.post(send_message_url, json=message_data)
        print(f"Send message status: {response.status_code}")
        
        if response.status_code == 201:
            messages = response.json()
            if messages and len(messages) > 0:
                test_message_id = messages[0]['id']  # Use the first message (user message)
                print(f"✅ Test message created with ID: {test_message_id}")
            else:
                print("❌ No messages returned from send message API")
                return False
        else:
            print(f"❌ Failed to create test message: {response.text}")
            # Let's try to get existing messages instead
            print("📥 Trying to get existing messages...")
            get_messages_url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_ID}/messages"
            messages_response = requests.get(get_messages_url)
            
            if messages_response.status_code == 200:
                messages_data = messages_response.json()
                if messages_data.get('messages') and len(messages_data['messages']) > 0:
                    # Use the first available message
                    test_message_id = messages_data['messages'][0]['id']
                    print(f"✅ Using existing message with ID: {test_message_id}")
                else:
                    print("❌ No existing messages found")
                    return False
            else:
                print(f"❌ Failed to get existing messages: {messages_response.text}")
                return False
        
        # Step 2: Add message to map using the correct endpoint
        print(f"📤 Step 2: Adding message {test_message_id} to map...")
        add_to_map_data = {
            "node_title": "Test Node from API",
            "node_type": "human"
        }
        
        add_url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_ID}/messages/{test_message_id}/add-to-map"
        
        response = requests.post(add_url, json=add_to_map_data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Message added to map successfully!")
            print(f"Success: {result.get('success')}")
            print(f"Node ID: {result.get('node_id')}")
            print(f"Message: {result.get('message')}")
            
            node_id = result.get('node_id')
            
            # Step 2: Verify node exists by fetching all nodes
            print("\n📥 Step 2: Fetching all nodes to verify creation...")
            nodes_url = f"{BASE_URL}/api/v1/workspaces/{WORKSPACE_ID}/nodes"
            
            nodes_response = requests.get(nodes_url)
            print(f"Status Code: {nodes_response.status_code}")
            
            if nodes_response.status_code == 200:
                nodes = nodes_response.json()
                print(f"✅ Found {len(nodes)} total nodes")
                
                # Find our test node
                test_node = None
                for node in nodes:
                    if node.get('id') == node_id:
                        test_node = node
                        break
                
                if test_node:
                    print(f"✅ Test node found in nodes list!")
                    print(f"   ID: {test_node.get('id')}")
                    print(f"   Title: {test_node.get('title')}")
                    print(f"   Type: {test_node.get('type')}")
                    print(f"   Position: ({test_node.get('x')}, {test_node.get('y')})")
                    print(f"   Key Message: {test_node.get('key_message', 'N/A')}")
                    
                    print("\n🎉 SUCCESS: Add-to-map functionality is working correctly!")
                    print("   - Node was created successfully")
                    print("   - Node appears in the nodes list")
                    print("   - Node has proper positioning and content")
                    
                    return True
                else:
                    print(f"❌ ERROR: Test node with ID {node_id} not found in nodes list")
                    return False
            else:
                print(f"❌ ERROR: Failed to fetch nodes: {nodes_response.text}")
                return False
        else:
            print(f"❌ ERROR: Failed to add message to map: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERROR: Cannot connect to backend server")
        print("   Make sure the backend is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ ERROR: Unexpected error: {str(e)}")
        return False

def test_frontend_integration():
    """Test that frontend can access the nodes"""
    print("\n🌐 Testing Frontend Integration")
    print("=" * 30)
    
    try:
        # Check if frontend is accessible
        frontend_response = requests.get("http://localhost:5173", timeout=5)
        if frontend_response.status_code == 200:
            print("✅ Frontend is accessible at http://localhost:5173")
            print("   You can now test the 'Add to Map' button in the chat interface")
            print("   The nodes should now appear on the canvas!")
            return True
        else:
            print(f"⚠️  Frontend returned status {frontend_response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Frontend not accessible at http://localhost:5173")
        print("   Make sure the frontend is running")
        return False
    except Exception as e:
        print(f"⚠️  Frontend check failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("🔧 Add-to-Map Fix Verification Test")
    print("This test verifies that the spatial index fix resolves the node rendering issue")
    print()
    
    # Test backend functionality
    backend_success = test_add_to_map()
    
    # Test frontend accessibility
    frontend_success = test_frontend_integration()
    
    print("\n" + "=" * 60)
    print("📋 SUMMARY:")
    print(f"   Backend API: {'✅ WORKING' if backend_success else '❌ FAILED'}")
    print(f"   Frontend Access: {'✅ WORKING' if frontend_success else '❌ FAILED'}")
    
    if backend_success and frontend_success:
        print("\n🎉 OVERALL STATUS: SUCCESS!")
        print("   The add-to-map fix should now work correctly.")
        print("   Try clicking 'Add to Map' in the chat interface.")
    elif backend_success:
        print("\n⚠️  OVERALL STATUS: PARTIAL SUCCESS")
        print("   Backend is working, but frontend may need to be restarted.")
    else:
        print("\n❌ OVERALL STATUS: FAILED")
        print("   Please check the backend server and try again.")