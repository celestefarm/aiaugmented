#!/usr/bin/env python3
"""
Test script to verify the node title summarization integration
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "celeste@example.com"
TEST_USER_PASSWORD = "password123"

def test_summarization_endpoint():
    """Test the node title summarization endpoint"""
    
    print("=== Testing Node Title Summarization Integration ===")
    print()
    
    # Step 1: Login to get authentication token
    print("1. Authenticating user...")
    login_response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        return False
    
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Authentication successful")
    
    # Step 2: Get user's workspaces
    print("\n2. Fetching workspaces...")
    workspaces_response = requests.get(f"{BASE_URL}/workspaces", headers=headers)
    
    if workspaces_response.status_code != 200:
        print(f"❌ Failed to fetch workspaces: {workspaces_response.status_code}")
        return False
    
    workspaces = workspaces_response.json()["workspaces"]
    if not workspaces:
        print("❌ No workspaces found")
        return False
    
    workspace_id = workspaces[0]["id"]
    print(f"✅ Using workspace: {workspace_id}")
    
    # Step 3: Get nodes from the workspace
    print("\n3. Fetching nodes...")
    nodes_response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers)
    
    if nodes_response.status_code != 200:
        print(f"❌ Failed to fetch nodes: {nodes_response.status_code}")
        return False
    
    nodes = nodes_response.json()["nodes"]
    if not nodes:
        print("❌ No nodes found in workspace")
        return False
    
    print(f"✅ Found {len(nodes)} nodes")
    
    # Step 4: Test summarization on each node
    print("\n4. Testing summarization...")
    
    for i, node in enumerate(nodes[:3]):  # Test first 3 nodes
        node_id = node["id"]
        original_title = node["title"]
        
        print(f"\n--- Node {i+1} ---")
        print(f"ID: {node_id}")
        print(f"Original title: {original_title}")
        print(f"Title length: {len(original_title)} chars")
        
        # Test different contexts
        contexts = ["card", "tooltip", "list"]
        
        for context in contexts:
            print(f"\nTesting context: {context}")
            
            # Call summarization endpoint
            summarize_response = requests.post(
                f"{BASE_URL}/nodes/{node_id}/summarize",
                headers=headers,
                json={
                    "context": context,
                    "max_length": {"card": 25, "tooltip": 40, "list": 30}[context]
                }
            )
            
            if summarize_response.status_code == 200:
                result = summarize_response.json()
                summarized_title = result["summarized_title"]
                method_used = result["method_used"]
                confidence = result.get("confidence", "N/A")
                
                print(f"  ✅ {context.capitalize()}: {summarized_title}")
                print(f"     Length: {len(summarized_title)} chars")
                print(f"     Method: {method_used}")
                print(f"     Confidence: {confidence}")
                
                # Verify length constraint
                max_length = {"card": 25, "tooltip": 40, "list": 30}[context]
                if len(summarized_title) <= max_length:
                    print(f"     ✅ Length constraint satisfied (≤{max_length})")
                else:
                    print(f"     ❌ Length constraint violated (>{max_length})")
                    
            else:
                print(f"  ❌ Failed to summarize for {context}: {summarize_response.status_code}")
                print(f"     Response: {summarize_response.text}")
    
    # Step 5: Verify that summarized titles are stored in the node
    print("\n5. Verifying summarized titles are stored...")
    
    # Fetch nodes again to see if summarized_titles field is populated
    nodes_response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers)
    updated_nodes = nodes_response.json()["nodes"]
    
    for node in updated_nodes[:3]:
        node_id = node["id"]
        summarized_titles = node.get("summarized_titles", {})
        
        print(f"\nNode {node_id}:")
        print(f"  Original title: {node['title']}")
        
        if summarized_titles:
            print("  Stored summarized titles:")
            for context, title in summarized_titles.items():
                print(f"    {context}: {title}")
            print("  ✅ Summarized titles stored successfully")
        else:
            print("  ❌ No summarized titles found")
    
    print("\n=== Test Complete ===")
    return True

if __name__ == "__main__":
    try:
        success = test_summarization_endpoint()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Test failed with exception: {e}")
        sys.exit(1)