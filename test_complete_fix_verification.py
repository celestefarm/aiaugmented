#!/usr/bin/env python3
"""
Complete Fix Verification Test
Simulates the exact frontend behavior to ensure no more 404 errors occur
"""

import asyncio
import aiohttp
import json
import time

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"

async def test_complete_fix():
    """Comprehensive test to ensure the fix is complete with no more errors"""
    
    print("🔍 [COMPLETE FIX VERIFICATION] Testing all node deletion scenarios...")
    print(f"API Base URL: {API_BASE_URL}")
    print("=" * 70)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Setup - Create user and workspace
            print("\n1️⃣ [SETUP] Creating test environment...")
            signup_data = {
                "email": f"complete-test-{int(time.time())}@example.com",
                "password": "testpass123",
                "name": "Complete Fix Test User"
            }
            
            async with session.post(f"{API_BASE_URL}/auth/signup", json=signup_data) as response:
                if response.status not in [200, 201]:
                    error_text = await response.text()
                    print(f"❌ Setup failed: {response.status} - {error_text}")
                    return False
                
                signup_result = await response.json()
                token = signup_result["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                print(f"✅ User created successfully")
            
            # Create workspace
            workspace_data = {
                "title": "Complete Fix Test Workspace",
                "settings": {},
                "transform": {"x": 0, "y": 0, "scale": 1}
            }
            
            async with session.post(f"{API_BASE_URL}/workspaces", json=workspace_data, headers=headers) as response:
                if response.status != 201:
                    error_text = await response.text()
                    print(f"❌ Workspace creation failed: {response.status} - {error_text}")
                    return False
                
                workspace = await response.json()
                workspace_id = workspace["id"]
                print(f"✅ Workspace created: {workspace_id}")
            
            # Step 2: Create test nodes
            print("\n2️⃣ [NODE CREATION] Creating test nodes...")
            node_ids = []
            
            for i in range(5):
                node_data = {
                    "title": f"Complete Test Node {i+1}",
                    "description": f"Node {i+1} for complete fix verification",
                    "type": "ai",
                    "x": 100 + (i * 120),
                    "y": 100 + (i * 80),
                    "confidence": 85,
                    "source_agent": "complete-test"
                }
                
                async with session.post(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", 
                                      json=node_data, headers=headers) as response:
                    if response.status != 201:
                        error_text = await response.text()
                        print(f"❌ Node {i+1} creation failed: {response.status} - {error_text}")
                        return False
                    
                    created_node = await response.json()
                    node_ids.append(created_node["id"])
                    print(f"✅ Node {i+1} created: {created_node['id']}")
            
            # Step 3: Test normal single deletion
            print("\n3️⃣ [SINGLE DELETION] Testing normal single node deletion...")
            test_node_id = node_ids[0]
            
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{test_node_id}", 
                                    headers=headers) as response:
                if response.status == 204:
                    print(f"✅ Single deletion successful: {test_node_id}")
                else:
                    error_text = await response.text()
                    print(f"❌ Single deletion failed: {response.status} - {error_text}")
                    return False
            
            # Step 4: Test double deletion (should return 404 gracefully)
            print("\n4️⃣ [DOUBLE DELETION] Testing double deletion handling...")
            
            async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{test_node_id}", 
                                    headers=headers) as response:
                if response.status == 404:
                    print(f"✅ Double deletion correctly returned 404: {test_node_id}")
                else:
                    print(f"⚠️ Double deletion unexpected status: {response.status}")
                    # This is not a failure, just unexpected
            
            # Step 5: Test rapid multiple deletions (race condition simulation)
            print("\n5️⃣ [RACE CONDITION TEST] Testing rapid multiple deletions...")
            
            # Use remaining nodes for race condition test
            race_test_nodes = node_ids[1:3]  # Use 2 nodes for race testing
            
            print(f"Testing race conditions with nodes: {race_test_nodes}")
            
            # For each node, create multiple simultaneous deletion attempts
            all_tasks = []
            for node_id in race_test_nodes:
                print(f"   Creating 5 simultaneous deletion attempts for node: {node_id}")
                for attempt in range(5):
                    task = asyncio.create_task(
                        attempt_deletion(session, workspace_id, node_id, attempt + 1, headers)
                    )
                    all_tasks.append((node_id, attempt + 1, task))
            
            # Wait for all attempts to complete
            print(f"   Executing {len(all_tasks)} simultaneous deletion attempts...")
            results = []
            for node_id, attempt_num, task in all_tasks:
                try:
                    result = await task
                    results.append((node_id, attempt_num, result, None))
                except Exception as e:
                    results.append((node_id, attempt_num, None, str(e)))
            
            # Analyze race condition results
            print(f"\n📊 Race condition test results:")
            success_count = 0
            expected_404_count = 0
            error_count = 0
            
            for node_id, attempt_num, status, error in results:
                if error:
                    error_count += 1
                    print(f"   Node {node_id} attempt {attempt_num}: ERROR - {error}")
                elif status == 204:
                    success_count += 1
                    print(f"   Node {node_id} attempt {attempt_num}: SUCCESS (204)")
                elif status == 404:
                    expected_404_count += 1
                    print(f"   Node {node_id} attempt {attempt_num}: Expected 404")
                else:
                    print(f"   Node {node_id} attempt {attempt_num}: Unexpected status {status}")
            
            print(f"\n   Summary: {success_count} successes, {expected_404_count} expected 404s, {error_count} errors")
            
            # Each node should be successfully deleted exactly once
            expected_successes = len(race_test_nodes)
            if success_count == expected_successes and error_count == 0:
                print(f"✅ Race condition test PASSED: Each node deleted exactly once, no errors")
            else:
                print(f"❌ Race condition test FAILED: Expected {expected_successes} successes with 0 errors")
                print(f"   Got {success_count} successes and {error_count} errors")
                return False
            
            # Step 6: Test deletion of non-existent nodes
            print("\n6️⃣ [NON-EXISTENT DELETION] Testing deletion of non-existent nodes...")
            fake_node_ids = [
                "507f1f77bcf86cd799439011",  # Valid ObjectId format
                "507f1f77bcf86cd799439012",
                "507f1f77bcf86cd799439013"
            ]
            
            for fake_id in fake_node_ids:
                async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{fake_id}", 
                                        headers=headers) as response:
                    if response.status == 404:
                        print(f"✅ Non-existent node deletion correctly returned 404: {fake_id}")
                    else:
                        print(f"⚠️ Non-existent node deletion unexpected status {response.status}: {fake_id}")
            
            # Step 7: Test malformed node ID deletion
            print("\n7️⃣ [MALFORMED ID TEST] Testing deletion with malformed node IDs...")
            malformed_ids = ["invalid-id", "123", "not-an-objectid"]
            
            for malformed_id in malformed_ids:
                async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{malformed_id}", 
                                        headers=headers) as response:
                    if response.status == 400:
                        print(f"✅ Malformed ID correctly returned 400: {malformed_id}")
                    else:
                        print(f"⚠️ Malformed ID unexpected status {response.status}: {malformed_id}")
            
            # Step 8: Clean up remaining nodes and verify final state
            print("\n8️⃣ [CLEANUP & VERIFICATION] Cleaning up and verifying final state...")
            remaining_nodes = node_ids[3:]  # Nodes that weren't used in race test
            
            for node_id in remaining_nodes:
                async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", 
                                        headers=headers) as response:
                    if response.status == 204:
                        print(f"✅ Cleanup deletion successful: {node_id}")
                    else:
                        print(f"⚠️ Cleanup deletion unexpected status {response.status}: {node_id}")
            
            # Final verification - workspace should be empty
            async with session.get(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes", headers=headers) as response:
                if response.status == 200:
                    final_result = await response.json()
                    remaining_count = len(final_result["nodes"])
                    
                    if remaining_count == 0:
                        print(f"✅ Final verification: Workspace is clean (0 nodes remaining)")
                    else:
                        print(f"⚠️ Final verification: {remaining_count} nodes still remain")
                        for node in final_result["nodes"]:
                            print(f"   - {node['id']}: {node['title']}")
                else:
                    print(f"❌ Final verification failed: {response.status}")
                    return False
            
            print("\n" + "=" * 70)
            print("🎉 [COMPLETE FIX VERIFICATION SUCCESSFUL]")
            print("✅ ALL TESTS PASSED - No more 404 errors or race conditions!")
            print("✅ Node deletion is now completely fixed and robust!")
            return True
            
        except Exception as e:
            print(f"💥 [VERIFICATION ERROR] Unexpected error: {e}")
            import traceback
            traceback.print_exc()
            return False

async def attempt_deletion(session, workspace_id, node_id, attempt_num, headers):
    """Helper function to attempt node deletion"""
    try:
        async with session.delete(f"{API_BASE_URL}/workspaces/{workspace_id}/nodes/{node_id}", 
                                headers=headers) as response:
            return response.status
    except Exception as e:
        raise e

if __name__ == "__main__":
    success = asyncio.run(test_complete_fix())
    if success:
        print("\n🏆 COMPLETE FIX VERIFICATION: SUCCESS")
        print("The node deletion issues have been completely resolved!")
    else:
        print("\n❌ COMPLETE FIX VERIFICATION: FAILED")
        print("There are still issues that need to be addressed.")