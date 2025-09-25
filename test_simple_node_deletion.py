#!/usr/bin/env python3
"""
Simple Node Deletion Test
Tests node deletion directly against the running backend server
"""

import asyncio
import aiohttp
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

async def test_node_deletion():
    """Test node deletion with a simple signup/login flow"""
    
    print("🔍 [SIMPLE TEST] Testing node deletion with fresh user...")
    print(f"API Base URL: {API_BASE_URL}")
    print("=" * 60)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Create a new user (signup)
            print("\n1️⃣ [SIGNUP] Creating new test user...")
            signup_data = {
                "email": f"test-{int(asyncio.get_event_loop().time())}@example.com",
                "password": "testpass123",
                "name": "Test User"
            }
            
            async with session.post(f"{API_BASE_URL}/auth/signup", json=signup_data) as response:
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    print(f"❌ Signup failed: {response.status} - {error_text}")
                    return
                
                signup_result = await response.json()
                token = signup_result["access_token"]
                user_id = signup_result["user"]["_id"]
                print(f"✅ Signup successful - User ID: {user_id}")
            
            # Set authorization header
            headers = {"Authorization": f"Bearer {token}"}
            
            # Step 2: Create a workspace
            print("\n2️⃣ [WORKSPACE] Creating test workspace...")
            workspace_data = {
                "title": "Test Workspace for Node Deletion",
                "settings": {},
                "transform": {"x": 0, "y": 0, "scale": 1}
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces", json=workspace_data, headers=headers) as response:
                if response.status != 201:
                    error_text = await response.text()
                    print(f"❌ Workspace creation failed: {response.status} - {error_text}")
                    return
                
                workspace = await response.json()
                workspace_id = workspace["id"]
                print(f"✅ Workspace created: {workspace_id}")
            
            # Step 3: Create a test node
            print("\n3️⃣ [NODE CREATION] Creating test node...")
            node_data = {
                "title": "Test Node for Deletion",
                "description": "This node will be deleted to test the deletion functionality",
                "type": "ai",
                "x": 100,
                "y": 100,
                "confidence": 85,
                "source_agent": "test-script"
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                  json=node_data, headers=headers) as response:
                if response.status != 201:
                    error_text = await response.text()
                    print(f"❌ Node creation failed: {response.status} - {error_text}")
                    return
                
                created_node = await response.json()
                node_id = created_node["id"]
                print(f"✅ Node created: {node_id}")
                print(f"   Title: '{created_node['title']}'")
            
            # Step 4: Verify node exists by fetching all nodes
            print("\n4️⃣ [VERIFICATION] Verifying node exists...")
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"❌ Failed to fetch nodes: {response.status} - {error_text}")
                    return
                
                nodes_result = await response.json()
                nodes = nodes_result["nodes"]
                
                node_exists = any(n["id"] == node_id for n in nodes)
                print(f"✅ Node verification: {len(nodes)} nodes found, target node exists: {node_exists}")
                
                if not node_exists:
                    print("❌ CRITICAL: Node was created but not found in workspace!")
                    return
            
            # Step 5: Test node deletion
            print("\n5️⃣ [DELETION TEST] Testing node deletion...")
            print(f"🎯 Deleting node: {node_id}")
            print(f"   Workspace: {workspace_id}")
            print(f"   DELETE URL: {API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}")
            
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", 
                                    headers=headers) as delete_response:
                
                print(f"📡 DELETE Response Status: {delete_response.status}")
                print(f"📡 DELETE Response Headers: {dict(delete_response.headers)}")
                
                if delete_response.status == 204:
                    print("✅ Node deletion successful (204 No Content)")
                    
                    # Verify deletion
                    print("\n6️⃣ [DELETION VERIFICATION] Verifying node was deleted...")
                    async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as verify_response:
                        if verify_response.status == 200:
                            verify_result = await verify_response.json()
                            remaining_nodes = verify_result["nodes"]
                            
                            node_still_exists = any(n["id"] == node_id for n in remaining_nodes)
                            print(f"✅ Verification: {len(remaining_nodes)} nodes remaining, deleted node still exists: {node_still_exists}")
                            
                            if node_still_exists:
                                print("❌ CRITICAL: Node deletion returned 204 but node still exists!")
                            else:
                                print("✅ SUCCESS: Node deletion worked correctly!")
                        else:
                            print(f"❌ Failed to verify deletion: {verify_response.status}")
                
                elif delete_response.status == 404:
                    error_text = await delete_response.text()
                    print(f"❌ Node deletion failed with 404: {error_text}")
                    
                    # This is the bug we're investigating!
                    print("\n🔍 [404 INVESTIGATION] Analyzing 404 error...")
                    
                    # Check if node still exists
                    async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as check_response:
                        if check_response.status == 200:
                            check_result = await check_response.json()
                            existing_nodes = check_result["nodes"]
                            
                            node_exists = any(n["id"] == node_id for n in existing_nodes)
                            print(f"   🔍 Node exists in workspace: {node_exists}")
                            
                            if node_exists:
                                print("   🚨 BUG CONFIRMED: Node exists but DELETE returned 404!")
                                print("   🚨 This indicates a backend routing or permission issue!")
                                
                                # Additional debugging
                                target_node = next((n for n in existing_nodes if n["id"] == node_id), None)
                                if target_node:
                                    print(f"   🔍 Target node details:")
                                    print(f"      ID: {target_node['id']}")
                                    print(f"      Workspace ID: {target_node['workspace_id']}")
                                    print(f"      Title: {target_node['title']}")
                                    
                                    # Check if workspace_id matches
                                    if target_node['workspace_id'] != workspace_id:
                                        print(f"   🚨 WORKSPACE MISMATCH: Node workspace_id ({target_node['workspace_id']}) != request workspace_id ({workspace_id})")
                            else:
                                print("   ✅ Node doesn't exist - 404 is correct")
                        else:
                            print(f"   ❌ Failed to check node existence: {check_response.status}")
                
                else:
                    error_text = await delete_response.text()
                    print(f"❌ Node deletion failed with {delete_response.status}: {error_text}")
            
            print("\n" + "=" * 60)
            print("🏁 [TEST COMPLETE]")
            
        except Exception as e:
            print(f"💥 [TEST ERROR] Unexpected error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_node_deletion())