#!/usr/bin/env python3
"""
Test script to verify button state synchronization after login/refresh.
This script tests the complete flow to ensure button states match canvas state.
"""

import requests
import json
import time

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "celeste.fcp@gmail.com"
TEST_PASSWORD = "celeste060291"

def test_button_state_synchronization():
    """Test the complete button state synchronization flow"""
    print("=== BUTTON STATE SYNCHRONIZATION TEST ===")
    
    # Step 1: Login
    print("\n1. Logging in...")
    login_response = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        return
    
    login_data = login_response.json()
    token = login_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # Step 2: Get workspace
    print("\n2. Getting workspace...")
    workspaces_response = requests.get(f"{API_BASE_URL}/workspaces", headers=headers)
    workspaces_data = workspaces_response.json()
    workspace_id = workspaces_data["workspaces"][0]["id"]
    print(f"✅ Using workspace: {workspace_id}")
    
    # Step 3: Upload a test document
    print("\n3. Uploading test document...")
    test_content = "This is a test document for button state synchronization testing."
    
    # Create a simple text file
    files = {
        'files': ('test_sync_document.txt', test_content, 'text/plain')
    }
    
    upload_response = requests.post(
        f"{API_BASE_URL}/workspaces/{workspace_id}/upload",
        headers={"Authorization": f"Bearer {token}"},
        files=files
    )
    
    if upload_response.status_code != 200:
        print(f"❌ Upload failed: {upload_response.status_code}")
        return
    
    upload_data = upload_response.json()
    document_id = upload_data[0]["id"]
    document_filename = upload_data[0]["filename"]
    print(f"✅ Document uploaded: {document_filename} ({document_id})")
    
    # Step 4: Create document message
    print("\n4. Creating document message...")
    doc_message_response = requests.post(
        f"{API_BASE_URL}/workspaces/{workspace_id}/messages/document",
        headers=headers,
        json=[document_id]
    )
    
    if doc_message_response.status_code != 200:
        print(f"❌ Document message creation failed: {doc_message_response.status_code}")
        return
    
    doc_message = doc_message_response.json()
    message_id = doc_message["id"]
    print(f"✅ Document message created: {message_id}")
    
    # Step 5: Add document to map (simulate button click)
    print("\n5. Adding document to map...")
    add_to_map_response = requests.post(
        f"{API_BASE_URL}/workspaces/{workspace_id}/messages/{message_id}/add-to-map",
        headers=headers,
        json={
            "node_title": f"Document: {document_filename.replace('.txt', '')}",
            "node_type": "human"
        }
    )
    
    if add_to_map_response.status_code != 200:
        print(f"❌ Add to map failed: {add_to_map_response.status_code}")
        return
    
    add_to_map_data = add_to_map_response.json()
    node_id = add_to_map_data["node_id"]
    print(f"✅ Document added to map, node created: {node_id}")
    
    # Step 6: Verify node exists on canvas
    print("\n6. Verifying node exists on canvas...")
    nodes_response = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers)
    nodes_data = nodes_response.json()
    
    document_node = None
    for node in nodes_data["nodes"]:
        if node["id"] == node_id:
            document_node = node
            break
    
    if not document_node:
        print(f"❌ Node not found on canvas: {node_id}")
        return
    
    print(f"✅ Node found on canvas: {document_node['title']}")
    
    # Step 7: Verify message shows added_to_map = true
    print("\n7. Verifying message state...")
    messages_response = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers)
    messages_data = messages_response.json()
    
    document_message = None
    for msg in messages_data["messages"]:
        if msg["id"] == message_id:
            document_message = msg
            break
    
    if not document_message:
        print(f"❌ Document message not found: {message_id}")
        return
    
    print(f"✅ Document message found, added_to_map: {document_message['added_to_map']}")
    
    # Step 8: Simulate logout/login cycle
    print("\n8. Simulating logout/login cycle...")
    print("   (Simulating by creating new session)")
    
    # Login again with new session
    login_response2 = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    login_data2 = login_response2.json()
    token2 = login_data2["access_token"]
    headers2 = {"Authorization": f"Bearer {token2}"}
    print("✅ Re-login successful")
    
    # Step 9: Verify data persistence after re-login
    print("\n9. Verifying data persistence after re-login...")
    
    # Check nodes still exist
    nodes_response2 = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers2)
    nodes_data2 = nodes_response2.json()
    
    node_still_exists = any(node["id"] == node_id for node in nodes_data2["nodes"])
    print(f"✅ Node still exists on canvas: {node_still_exists}")
    
    # Check messages still exist
    messages_response2 = requests.get(f"{API_BASE_URL}/workspaces/{workspace_id}/messages", headers=headers2)
    messages_data2 = messages_response2.json()
    
    message_still_exists = any(msg["id"] == message_id for msg in messages_data2["messages"])
    document_message2 = next((msg for msg in messages_data2["messages"] if msg["id"] == message_id), None)
    
    print(f"✅ Message still exists: {message_still_exists}")
    if document_message2:
        print(f"✅ Message added_to_map status: {document_message2['added_to_map']}")
    
    # Step 10: Test Results Summary
    print("\n10. TEST RESULTS SUMMARY")
    print("=" * 50)
    
    success_criteria = [
        ("Document uploaded successfully", True),
        ("Document message created", True),
        ("Node created on canvas", document_node is not None),
        ("Message marked as added_to_map", document_message and document_message['added_to_map']),
        ("Node persists after re-login", node_still_exists),
        ("Message persists after re-login", message_still_exists),
        ("Message status persists after re-login", document_message2 and document_message2['added_to_map'])
    ]
    
    all_passed = True
    for criteria, passed in success_criteria:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {criteria}")
        if not passed:
            all_passed = False
    
    print("=" * 50)
    if all_passed:
        print("🎉 ALL TESTS PASSED!")
        print("Button state synchronization should work correctly.")
        print("Frontend should show 'Added to Map' after login/refresh.")
    else:
        print("❌ SOME TESTS FAILED!")
        print("Button state synchronization may not work correctly.")
    
    # Step 11: Cleanup (optional)
    print("\n11. Cleanup...")
    try:
        # Delete the test node
        requests.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", headers=headers2)
        print("✅ Test node cleaned up")
    except:
        print("⚠️ Cleanup failed (not critical)")
    
    print("\n=== BUTTON STATE SYNCHRONIZATION TEST COMPLETE ===")

if __name__ == "__main__":
    test_button_state_synchronization()