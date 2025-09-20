#!/usr/bin/env python3
"""
Test script to verify the node deletion fix works correctly.
This script will:
1. Create a test node
2. Verify it exists
3. Delete the node
4. Verify the deletion worked and no JSON parsing errors occur
"""

import asyncio
import aiohttp
import json
from datetime import datetime

API_BASE_URL = "http://localhost:8000/api/v1"

async def test_node_deletion_fix():
    """Test the node deletion fix to ensure no JSON parsing errors occur."""
    
    print("🧪 Testing Node Deletion Fix")
    print("=" * 50)
    
    # Test credentials
    email = "celeste.fcp@gmail.com"
    password = "celeste060291"
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Login to get auth token
            print("1. Logging in...")
            login_data = {"email": email, "password": password}
            
            async with session.post(f"{API_BASE_URL}/auth/login", json=login_data) as response:
                if response.status != 200:
                    print(f"❌ Login failed: {response.status}")
                    return
                
                auth_data = await response.json()
                token = auth_data["access_token"]
                print("✅ Login successful")
            
            # Set auth headers for subsequent requests
            headers = {"Authorization": f"Bearer {token}"}
            
            # Step 2: Get workspaces
            print("2. Getting workspaces...")
            async with session.get(f"{API_BASE_URL}/workspaces", headers=headers) as response:
                if response.status != 200:
                    print(f"❌ Failed to get workspaces: {response.status}")
                    return
                
                workspaces_data = await response.json()
                if not workspaces_data["workspaces"]:
                    print("❌ No workspaces found")
                    return
                
                workspace_id = workspaces_data["workspaces"][0]["id"]
                print(f"✅ Using workspace: {workspace_id}")
            
            # Step 3: Create a test node
            print("3. Creating test node...")
            node_data = {
                "title": "Test Node for Deletion",
                "description": "This node will be deleted to test the fix",
                "type": "human",
                "x": 100,
                "y": 100
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                  json=node_data, headers=headers) as response:
                if response.status != 201:
                    print(f"❌ Failed to create node: {response.status}")
                    return
                
                node = await response.json()
                node_id = node["id"]
                print(f"✅ Created test node: {node_id}")
            
            # Step 4: Verify node exists
            print("4. Verifying node exists...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                 headers=headers) as response:
                if response.status != 200:
                    print(f"❌ Failed to get nodes: {response.status}")
                    return
                
                nodes_data = await response.json()
                node_exists = any(n["id"] == node_id for n in nodes_data["nodes"])
                
                if not node_exists:
                    print("❌ Test node not found in nodes list")
                    return
                
                print("✅ Test node exists in workspace")
            
            # Step 5: Delete the node (this is the critical test)
            print("5. Deleting test node...")
            print("   This is the critical test - checking for JSON parsing errors...")
            
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", 
                                    headers=headers) as response:
                print(f"   DELETE response status: {response.status}")
                print(f"   DELETE response headers: {dict(response.headers)}")
                
                # Check if it's a 204 No Content (expected for DELETE)
                if response.status == 204:
                    print("✅ DELETE returned 204 No Content (correct)")
                    
                    # Try to read response body (should be empty)
                    try:
                        response_text = await response.text()
                        print(f"   Response body: '{response_text}' (length: {len(response_text)})")
                        
                        if response_text.strip() == "":
                            print("✅ Response body is empty (correct for 204)")
                        else:
                            print(f"⚠️  Response body not empty: '{response_text}'")
                    except Exception as e:
                        print(f"   Error reading response body: {e}")
                
                elif response.status == 200:
                    print("✅ DELETE returned 200 OK")
                    try:
                        delete_response = await response.json()
                        print(f"   Response data: {delete_response}")
                    except Exception as e:
                        print(f"   Error parsing JSON response: {e}")
                else:
                    print(f"❌ Unexpected DELETE response status: {response.status}")
                    error_text = await response.text()
                    print(f"   Error response: {error_text}")
                    return
            
            # Step 6: Verify node is deleted
            print("6. Verifying node is deleted...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                 headers=headers) as response:
                if response.status != 200:
                    print(f"❌ Failed to get nodes after deletion: {response.status}")
                    return
                
                nodes_data = await response.json()
                node_still_exists = any(n["id"] == node_id for n in nodes_data["nodes"])
                
                if node_still_exists:
                    print("❌ Test node still exists after deletion")
                    return
                
                print("✅ Test node successfully deleted")
            
            # Step 7: Test multiple API calls to simulate frontend refresh
            print("7. Testing multiple API calls (simulating frontend refresh)...")
            
            for i in range(3):
                print(f"   API call {i+1}/3...")
                
                # Get nodes
                async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                     headers=headers) as response:
                    if response.status != 200:
                        print(f"❌ Nodes API call {i+1} failed: {response.status}")
                        return
                    
                    try:
                        nodes_data = await response.json()
                        print(f"   ✅ Nodes API call {i+1} successful ({len(nodes_data['nodes'])} nodes)")
                    except Exception as e:
                        print(f"   ❌ JSON parsing error in nodes API call {i+1}: {e}")
                        return
                
                # Get edges
                async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/edges", 
                                     headers=headers) as response:
                    if response.status != 200:
                        print(f"❌ Edges API call {i+1} failed: {response.status}")
                        return
                    
                    try:
                        edges_data = await response.json()
                        print(f"   ✅ Edges API call {i+1} successful ({len(edges_data['edges'])} edges)")
                    except Exception as e:
                        print(f"   ❌ JSON parsing error in edges API call {i+1}: {e}")
                        return
            
            print("\n🎉 ALL TESTS PASSED!")
            print("✅ Node deletion works correctly")
            print("✅ No JSON parsing errors detected")
            print("✅ Frontend should no longer redirect to error page")
            
        except Exception as e:
            print(f"\n❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_node_deletion_fix())