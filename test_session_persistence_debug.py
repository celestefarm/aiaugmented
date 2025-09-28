#!/usr/bin/env python3
"""
Test script to debug session persistence issues.
This script simulates the login/logout flow to identify where data is being lost.
"""

import requests
import json
import time

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "celeste.fcp@gmail.com"
TEST_PASSWORD = "celeste060291"

def test_session_persistence():
    """Test the complete session persistence flow"""
    print("=== SESSION PERSISTENCE DEBUG TEST ===")
    
    # Step 1: Login
    print("\n1. Logging in...")
    login_response = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return
    
    login_data = login_response.json()
    token = login_data["access_token"]
    user_id = login_data["user"]["_id"]
    print(f"✅ Login successful. User ID: {user_id}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Get workspaces
    print("\n2. Getting workspaces...")
    workspaces_response = requests.get(f"{API_BASE_URL}/workspaces", headers=headers)
    
    if workspaces_response.status_code != 200:
        print(f"❌ Failed to get workspaces: {workspaces_response.status_code}")
        return
    
    workspaces_data = workspaces_response.json()
    workspaces = workspaces_data["workspaces"]
    
    if not workspaces:
        print("❌ No workspaces found")
        return
    
    workspace_id = workspaces[0]["id"]
    print(f"✅ Found {len(workspaces)} workspaces. Using workspace: {workspace_id}")
    
    # Step 3: Get messages for the workspace
    print("\n3. Getting messages...")
    messages_response = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers)
    
    if messages_response.status_code != 200:
        print(f"❌ Failed to get messages: {messages_response.status_code}")
        return
    
    messages_data = messages_response.json()
    messages = messages_data["messages"]
    print(f"✅ Found {len(messages)} messages in workspace")
    
    # Print message details
    for i, msg in enumerate(messages[:5]):  # Show first 5 messages
        print(f"  Message {i+1}: {msg['type']} - {msg['content'][:50]}...")
    
    # Step 4: Send a test message to ensure we have data
    print("\n4. Sending test message...")
    test_message_response = requests.post(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", 
                                        headers=headers,
                                        json={"content": "Test message for session persistence"})
    
    if test_message_response.status_code != 200:
        print(f"❌ Failed to send test message: {test_message_response.status_code}")
        return
    
    new_messages = test_message_response.json()
    print(f"✅ Sent test message. Received {len(new_messages)} messages back")
    
    # Step 5: Get messages again to confirm persistence
    print("\n5. Confirming message persistence...")
    messages_response2 = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers)
    
    if messages_response2.status_code != 200:
        print(f"❌ Failed to get messages again: {messages_response2.status_code}")
        return
    
    messages_data2 = messages_response2.json()
    messages2 = messages_data2["messages"]
    print(f"✅ Found {len(messages2)} messages after sending test message")
    
    # Step 6: Simulate logout (just clear token, don't call logout endpoint)
    print("\n6. Simulating logout (clearing token)...")
    print("✅ Token cleared (simulated)")
    
    # Step 7: Login again
    print("\n7. Logging in again...")
    login_response2 = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response2.status_code != 200:
        print(f"❌ Second login failed: {login_response2.status_code}")
        return
    
    login_data2 = login_response2.json()
    token2 = login_data2["access_token"]
    print(f"✅ Second login successful")
    
    headers2 = {"Authorization": f"Bearer {token2}"}
    
    # Step 8: Get workspaces again
    print("\n8. Getting workspaces after re-login...")
    workspaces_response2 = requests.get(f"{API_BASE_URL}/workspaces", headers=headers2)
    
    if workspaces_response2.status_code != 200:
        print(f"❌ Failed to get workspaces after re-login: {workspaces_response2.status_code}")
        return
    
    workspaces_data2 = workspaces_response2.json()
    workspaces2 = workspaces_data2["workspaces"]
    print(f"✅ Found {len(workspaces2)} workspaces after re-login")
    
    # Step 9: Get messages after re-login
    print("\n9. Getting messages after re-login...")
    messages_response3 = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers2)
    
    if messages_response3.status_code != 200:
        print(f"❌ Failed to get messages after re-login: {messages_response3.status_code}")
        return
    
    messages_data3 = messages_response3.json()
    messages3 = messages_data3["messages"]
    print(f"✅ Found {len(messages3)} messages after re-login")
    
    # Step 10: Compare message counts
    print("\n10. Comparing message persistence...")
    print(f"Messages before logout: {len(messages2)}")
    print(f"Messages after re-login: {len(messages3)}")
    
    if len(messages3) == len(messages2):
        print("✅ SUCCESS: All messages persisted across login/logout cycle")
    else:
        print("❌ FAILURE: Message count changed after login/logout cycle")
        print("This indicates a backend persistence issue, not a frontend issue")
    
    # Step 11: Check if our test message is still there
    test_message_found = any(msg['content'] == "Test message for session persistence" for msg in messages3)
    if test_message_found:
        print("✅ Test message found after re-login")
    else:
        print("❌ Test message missing after re-login")
    
    print("\n=== SESSION PERSISTENCE TEST COMPLETE ===")

if __name__ == "__main__":
    test_session_persistence()