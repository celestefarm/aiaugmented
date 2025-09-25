#!/usr/bin/env python3
"""
Node Deletion Diagnosis Script
Diagnoses the node deletion 404 errors by testing the API endpoints directly
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "celeste.fcc@gmail.com"
TEST_USER_PASSWORD = "password123"

async def diagnose_node_deletion():
    """Diagnose node deletion issues by testing API endpoints directly"""
    
    print("🔍 [DIAGNOSIS] Starting node deletion diagnosis...")
    print(f"API Base URL: {API_BASE_URL}")
    print(f"Test user: {TEST_USER_EMAIL}")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Login and get token
            print("\n1️⃣ [LOGIN] Authenticating user...")
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            async with session.post(f"{API_BASE_URL}/auth/login", json=login_data) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Login failed: {response.status} - {error_text}")
                    return
                
                login_result = await response.json()
                token = login_result["access_token"]
                user_id = login_result["user"]["_id"]
                print(f"✅ Login successful - User ID: {user_id}")
            
            # Set authorization header for subsequent requests
            headers = {"Authorization": f"Bearer {token}"}
            
            # Step 2: Get user's workspaces
            print("\n2️⃣ [WORKSPACES] Fetching user workspaces...")
            async with session.get(f"{API_BASE_URL}/workspaces", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to get workspaces: {response.status} - {error_text}")
                    return
                
                workspaces_result = await response.json()
                workspaces = workspaces_result["workspaces"]
                
                if not workspaces:
                    print("❌ No workspaces found for user")
                    return
                
                workspace_id = workspaces[0]["id"]
                print(f"✅ Using workspace: {workspace_id}")
            
            # Step 3: Get nodes in workspace
            print("\n3️⃣ [NODES] Fetching nodes in workspace...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to get nodes: {response.status} - {error_text}")
                    return
                
                nodes_result = await response.json()
                nodes = nodes_result["nodes"]
                
                print(f"✅ Found {len(nodes)} nodes in workspace")
                
                if not nodes:
                    print("⚠️ No nodes found - creating a test node for deletion testing...")
                    
                    # Create a test node
                    test_node_data = {
                        "title": "Test Node for Deletion Diagnosis",
                        "description": "This node is created for testing deletion functionality",
                        "type": "ai",
                        "x": 100,
                        "y": 100,
                        "confidence": 85,
                        "source_agent": "diagnosis-script"
                    }
                    
                    async with session.post(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                          json=test_node_data, headers=headers) as create_response:
                        if create_response.status != 201:
                            error_text = await create_response.text()
                            print(f"❌ Failed to create test node: {create_response.status} - {error_text}")
                            return
                        
                        created_node = await create_response.json()
                        nodes = [created_node]
                        print(f"✅ Created test node: {created_node['id']}")
                
                # Display node information
                for i, node in enumerate(nodes):
                    print(f"  Node {i+1}: {node['id']} - '{node['title']}'")
            
            # Step 4: Test node deletion with detailed logging
            print("\n4️⃣ [DELETION TEST] Testing node deletion...")
            
            if nodes:
                test_node = nodes[0]
                node_id = test_node["id"]
                
                print(f"🎯 Testing deletion of node: {node_id}")
                print(f"   Title: '{test_node['title']}'")
                print(f"   Workspace ID: {workspace_id}")
                print(f"   DELETE URL: {API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}")
                
                # Attempt deletion
                async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", 
                                        headers=headers) as delete_response:
                    
                    print(f"📡 DELETE Response Status: {delete_response.status}")
                    print(f"📡 DELETE Response Headers: {dict(delete_response.headers)}")
                    
                    if delete_response.status == 204:
                        print("✅ Node deletion successful (204 No Content)")
                    elif delete_response.status == 404:
                        error_text = await delete_response.text()
                        print(f"❌ Node deletion failed with 404: {error_text}")
                        
                        # Additional diagnosis for 404 error
                        print("\n🔍 [404 DIAGNOSIS] Investigating 404 error...")
                        
                        # Check if node still exists by trying to fetch it
                        async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                             headers=headers) as check_response:
                            if check_response.status == 200:
                                check_result = await check_response.json()
                                existing_nodes = check_result["nodes"]
                                
                                node_exists = any(n["id"] == node_id for n in existing_nodes)
                                print(f"   Node exists in workspace: {node_exists}")
                                
                                if node_exists:
                                    print("   🚨 ISSUE: Node exists but DELETE returned 404")
                                    print("   This suggests a routing or permission issue")
                                else:
                                    print("   Node was already deleted or never existed")
                            else:
                                print(f"   Failed to check node existence: {check_response.status}")
                        
                        # Check workspace access
                        async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}", 
                                             headers=headers) as workspace_check:
                            if workspace_check.status == 200:
                                print("   ✅ Workspace access is valid")
                            else:
                                print(f"   ❌ Workspace access issue: {workspace_check.status}")
                        
                        # Check if the node ID format is valid
                        print(f"   Node ID format: {node_id} (length: {len(node_id)})")
                        
                        # Try to validate ObjectId format
                        try:
                            from bson import ObjectId
                            ObjectId(node_id)
                            print("   ✅ Node ID is valid ObjectId format")
                        except Exception as e:
                            print(f"   ❌ Node ID is invalid ObjectId format: {e}")
                    
                    else:
                        error_text = await delete_response.text()
                        print(f"❌ Node deletion failed with {delete_response.status}: {error_text}")
            
            # Step 5: Test edge cases
            print("\n5️⃣ [EDGE CASES] Testing edge cases...")
            
            # Test with invalid node ID
            invalid_node_id = "507f1f77bcf86cd799439011"  # Valid ObjectId format but non-existent
            print(f"🧪 Testing deletion with invalid node ID: {invalid_node_id}")
            
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{invalid_node_id}", 
                                    headers=headers) as invalid_response:
                print(f"   Response: {invalid_response.status}")
                if invalid_response.status != 204:
                    error_text = await invalid_response.text()
                    print(f"   Error: {error_text}")
            
            # Test with malformed node ID
            malformed_node_id = "invalid-id-format"
            print(f"🧪 Testing deletion with malformed node ID: {malformed_node_id}")
            
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{malformed_node_id}", 
                                    headers=headers) as malformed_response:
                print(f"   Response: {malformed_response.status}")
                if malformed_response.status != 204:
                    error_text = await malformed_response.text()
                    print(f"   Error: {error_text}")
            
            print("\n" + "=" * 60)
            print("🏁 [DIAGNOSIS COMPLETE]")
            print("Check the output above for specific issues with node deletion.")
            
        except Exception as e:
            print(f"💥 [DIAGNOSIS ERROR] Unexpected error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(diagnose_node_deletion())