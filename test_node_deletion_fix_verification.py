#!/usr/bin/env python3

import requests
import json
import time

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
WORKSPACE_ID = "68d579e446ea8e53f748eef5"  # From the logs
USER_EMAIL = "celeste.fcp@gmail.com"
USER_PASSWORD = "celeste060291"

def login():
    """Login and get access token"""
    print("🔐 [LOGIN] Logging in...")
    
    login_data = {
        "email": USER_EMAIL,
        "password": USER_PASSWORD
    }
    
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        print(f"🔐 [LOGIN] ✅ Login successful")
        return data["access_token"]
    else:
        print(f"🔐 [LOGIN] ❌ Login failed: {response.status_code} - {response.text}")
        return None

def get_headers(token):
    """Get headers with authorization"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def send_test_message(token):
    """Send a test message to create a message that can be added to map"""
    print("💬 [MESSAGE] Sending test message...")
    
    message_data = {
        "content": "This is a test message for node deletion verification"
    }
    
    response = requests.post(
        f"{BASE_URL}/workspaces/{WORKSPACE_ID}/messages",
        json=message_data,
        headers=get_headers(token)
    )
    
    if response.status_code == 201:  # Messages endpoint returns 201 Created
        messages = response.json()
        # Find the human message (the one we just sent)
        human_message = None
        for msg in messages:
            if msg.get("type") == "human" and "test message for node deletion" in msg.get("content", ""):
                human_message = msg
                break
        
        if human_message:
            print(f"💬 [MESSAGE] ✅ Test message created: {human_message['id']}")
            return human_message["id"]
        else:
            print("💬 [MESSAGE] ❌ Could not find human message in response")
            print(f"💬 [MESSAGE] Response: {messages}")
            return None
    else:
        print(f"💬 [MESSAGE] ❌ Failed to send message: {response.status_code} - {response.text}")
        return None

def add_message_to_map(token, message_id):
    """Add message to map and return node ID"""
    print(f"🗺️ [ADD-TO-MAP] Adding message {message_id} to map...")
    
    add_data = {
        "node_title": "Test Node for Deletion",
        "node_type": "human"
    }
    
    response = requests.post(
        f"{BASE_URL}/workspaces/{WORKSPACE_ID}/messages/{message_id}/add-to-map",
        json=add_data,
        headers=get_headers(token)
    )
    
    if response.status_code == 200:
        data = response.json()
        if data.get("success"):
            node_id = data.get("node_id")
            print(f"🗺️ [ADD-TO-MAP] ✅ Message added to map, node ID: {node_id}")
            return node_id
        else:
            print(f"🗺️ [ADD-TO-MAP] ❌ API returned success=false: {data.get('message')}")
            return None
    else:
        print(f"🗺️ [ADD-TO-MAP] ❌ Failed to add to map: {response.status_code} - {response.text}")
        return None

def check_message_state(token, message_id):
    """Check if message is marked as added_to_map"""
    print(f"🔍 [CHECK-STATE] Checking message state for {message_id}...")
    
    response = requests.get(
        f"{BASE_URL}/workspaces/{WORKSPACE_ID}/messages",
        headers=get_headers(token)
    )
    
    if response.status_code == 200:
        data = response.json()
        messages = data.get("messages", [])
        
        target_message = None
        for msg in messages:
            if msg["id"] == message_id:
                target_message = msg
                break
        
        if target_message:
            added_to_map = target_message.get("added_to_map", False)
            print(f"🔍 [CHECK-STATE] Message {message_id} added_to_map: {added_to_map}")
            return added_to_map
        else:
            print(f"🔍 [CHECK-STATE] ❌ Message {message_id} not found")
            return None
    else:
        print(f"🔍 [CHECK-STATE] ❌ Failed to get messages: {response.status_code} - {response.text}")
        return None

def delete_node(token, node_id):
    """Delete node from canvas"""
    print(f"🗑️ [DELETE-NODE] Deleting node {node_id}...")
    
    response = requests.delete(
        f"{BASE_URL}/workspaces/{WORKSPACE_ID}/nodes/{node_id}",
        headers=get_headers(token)
    )
    
    if response.status_code == 204:  # DELETE operations return 204 No Content on success
        print(f"🗑️ [DELETE-NODE] ✅ Node deleted successfully")
        return True
    else:
        print(f"🗑️ [DELETE-NODE] ❌ Failed to delete node: {response.status_code} - {response.text}")
        return False

def main():
    """Main test function"""
    print("🧪 [TEST] Starting node deletion fix verification...")
    print("=" * 60)
    
    # Step 1: Login
    token = login()
    if not token:
        print("❌ [FAILED] Could not login")
        return
    
    # Step 2: Send test message
    message_id = send_test_message(token)
    if not message_id:
        print("❌ [FAILED] Could not create test message")
        return
    
    # Step 3: Check initial message state (should be False)
    initial_state = check_message_state(token, message_id)
    if initial_state is None:
        print("❌ [FAILED] Could not check initial message state")
        return
    
    if initial_state:
        print("⚠️ [WARNING] Message already marked as added_to_map")
    else:
        print("✅ [INITIAL-STATE] Message correctly marked as not added to map")
    
    # Step 4: Add message to map
    node_id = add_message_to_map(token, message_id)
    if not node_id:
        print("❌ [FAILED] Could not add message to map")
        return
    
    # Step 5: Check message state after adding to map (should be True)
    time.sleep(1)  # Brief delay for state update
    after_add_state = check_message_state(token, message_id)
    if after_add_state is None:
        print("❌ [FAILED] Could not check message state after adding to map")
        return
    
    if after_add_state:
        print("✅ [AFTER-ADD] Message correctly marked as added_to_map")
    else:
        print("❌ [FAILED] Message not marked as added_to_map after adding")
        return
    
    # Step 6: Delete the node (this should revert the message state)
    delete_success = delete_node(token, node_id)
    if not delete_success:
        print("❌ [FAILED] Could not delete node")
        return
    
    # Step 7: Check message state after node deletion (should be False again)
    time.sleep(2)  # Brief delay for state update
    after_delete_state = check_message_state(token, message_id)
    if after_delete_state is None:
        print("❌ [FAILED] Could not check message state after node deletion")
        return
    
    # Final verification
    print("=" * 60)
    print("🧪 [TEST RESULTS]")
    print(f"Initial state (should be False): {initial_state}")
    print(f"After add to map (should be True): {after_add_state}")
    print(f"After node deletion (should be False): {after_delete_state}")
    
    if not after_delete_state:
        print("🎉 [SUCCESS] Node deletion correctly reverted message state!")
        print("✅ The 'Added to map' button should now show 'Add to map' again")
    else:
        print("❌ [FAILED] Node deletion did not revert message state")
        print("❌ The message is still marked as added_to_map")
    
    print("=" * 60)

if __name__ == "__main__":
    main()