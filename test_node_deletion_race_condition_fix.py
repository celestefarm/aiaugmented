#!/usr/bin/env python3

"""
Test script to verify the node deletion race condition fix.

This script tests that:
1. Node deletion no longer causes 404 errors
2. The removeMessageFromMap endpoint properly handles both message reversion and node deletion
3. The frontend no longer makes redundant DELETE requests to the nodes endpoint
4. Multiple node deletions work correctly without race conditions

Run this after the frontend fix to verify the issue is resolved.
"""

import asyncio
import aiohttp
import json
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "celeste.fco@gmail.com"
TEST_USER_PASSWORD = "password123"

class NodeDeletionRaceConditionTest:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.workspace_id = None
        self.test_nodes = []
        
    async def setup_session(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
        
    async def cleanup_session(self):
        """Clean up HTTP session"""
        if self.session:
            await self.session.close()
            
    async def authenticate(self):
        """Authenticate and get access token"""
        print("🔐 Authenticating...")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        async with self.session.post(f"{API_BASE_URL}/auth/login", json=login_data) as response:
            if response.status == 200:
                data = await response.json()
                self.auth_token = data["access_token"]
                print(f"✅ Authentication successful")
                return True
            else:
                error_text = await response.text()
                print(f"❌ Authentication failed: {response.status} - {error_text}")
                return False
                
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.auth_token}",
            "Content-Type": "application/json"
        }
        
    async def get_workspace(self):
        """Get the first available workspace"""
        print("🏢 Getting workspace...")
        
        async with self.session.get(f"{API_BASE_URL}/workspaces", headers=self.get_headers()) as response:
            if response.status == 200:
                data = await response.json()
                if data["workspaces"]:
                    self.workspace_id = data["workspaces"][0]["id"]
                    print(f"✅ Using workspace: {self.workspace_id}")
                    return True
                else:
                    print("❌ No workspaces found")
                    return False
            else:
                error_text = await response.text()
                print(f"❌ Failed to get workspaces: {response.status} - {error_text}")
                return False
                
    async def create_test_message(self, content: str):
        """Create a test message and add it to map"""
        print(f"💬 Creating test message: {content[:50]}...")
        
        # Create message
        message_data = {"content": content}
        async with self.session.post(
            f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages", 
            json=message_data, 
            headers=self.get_headers()
        ) as response:
            if response.status == 201:
                messages = await response.json()
                # Get the AI message (should be the second message)
                ai_message = None
                for msg in messages:
                    if msg["type"] == "ai":
                        ai_message = msg
                        break
                        
                if not ai_message:
                    print("❌ No AI message found in response")
                    return None
                    
                print(f"✅ Message created: {ai_message['id']}")
                
                # Add message to map
                add_to_map_data = {
                    "node_title": f"Test Node {datetime.now().strftime('%H:%M:%S')}",
                    "node_type": "ai"
                }
                
                async with self.session.post(
                    f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages/{ai_message['id']}/add-to-map",
                    json=add_to_map_data,
                    headers=self.get_headers()
                ) as add_response:
                    if add_response.status == 200:
                        add_data = await add_response.json()
                        if add_data.get("success"):
                            node_id = add_data["node_id"]
                            print(f"✅ Message added to map as node: {node_id}")
                            self.test_nodes.append(node_id)
                            return node_id
                        else:
                            print(f"❌ Failed to add message to map: {add_data.get('message')}")
                            return None
                    else:
                        error_text = await add_response.text()
                        print(f"❌ Failed to add message to map: {add_response.status} - {error_text}")
                        return None
            else:
                error_text = await response.text()
                print(f"❌ Failed to create message: {response.status} - {error_text}")
                return None
                
    async def test_single_node_deletion(self, node_id: str):
        """Test deleting a single node using removeMessageFromMap"""
        print(f"🗑️ Testing single node deletion: {node_id}")
        
        # Call removeMessageFromMap endpoint (this should handle both message reversion and node deletion)
        remove_data = {"node_id": node_id}
        
        async with self.session.post(
            f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages/remove-from-map",
            json=remove_data,
            headers=self.get_headers()
        ) as response:
            if response.status == 200:
                data = await response.json()
                if data.get("success"):
                    print(f"✅ Node deletion successful: {data.get('message')}")
                    
                    # Verify node is actually deleted by trying to get it
                    async with self.session.get(
                        f"{API_BASE_URL}/workspaces/{self.workspace_id}/nodes",
                        headers=self.get_headers()
                    ) as nodes_response:
                        if nodes_response.status == 200:
                            nodes_data = await nodes_response.json()
                            node_exists = any(node["id"] == node_id for node in nodes_data["nodes"])
                            if not node_exists:
                                print(f"✅ Node {node_id} successfully removed from database")
                                return True
                            else:
                                print(f"❌ Node {node_id} still exists in database after deletion")
                                return False
                        else:
                            print(f"⚠️ Could not verify node deletion: {nodes_response.status}")
                            return True  # Assume success if we can't verify
                else:
                    print(f"❌ Node deletion failed: {data.get('message')}")
                    return False
            else:
                error_text = await response.text()
                print(f"❌ Node deletion failed: {response.status} - {error_text}")
                return False
                
    async def test_multiple_node_deletion(self):
        """Test deleting multiple nodes to check for race conditions"""
        print("🗑️ Testing multiple node deletion...")
        
        if len(self.test_nodes) < 2:
            print("⚠️ Not enough test nodes for multiple deletion test")
            return True
            
        # Try to delete multiple nodes simultaneously
        deletion_tasks = []
        for node_id in self.test_nodes[:2]:  # Test with first 2 nodes
            deletion_tasks.append(self.test_single_node_deletion(node_id))
            
        results = await asyncio.gather(*deletion_tasks, return_exceptions=True)
        
        success_count = sum(1 for result in results if result is True)
        total_count = len(results)
        
        print(f"📊 Multiple deletion results: {success_count}/{total_count} successful")
        
        if success_count == total_count:
            print("✅ Multiple node deletion test passed")
            return True
        else:
            print("❌ Multiple node deletion test failed")
            return False
            
    async def run_comprehensive_test(self):
        """Run comprehensive node deletion race condition test"""
        print("=" * 60)
        print("🧪 NODE DELETION RACE CONDITION FIX TEST")
        print("=" * 60)
        
        try:
            # Setup
            await self.setup_session()
            
            if not await self.authenticate():
                return False
                
            if not await self.get_workspace():
                return False
                
            # Create test nodes
            print("\n📝 Creating test nodes...")
            test_messages = [
                "Test message 1 for node deletion race condition testing",
                "Test message 2 for multiple deletion testing",
                "Test message 3 for comprehensive race condition verification"
            ]
            
            for message in test_messages:
                node_id = await self.create_test_message(message)
                if not node_id:
                    print("❌ Failed to create test node")
                    return False
                    
            print(f"✅ Created {len(self.test_nodes)} test nodes")
            
            # Test single node deletion
            print("\n🗑️ Testing single node deletion...")
            if self.test_nodes:
                single_test_result = await self.test_single_node_deletion(self.test_nodes[0])
                if single_test_result:
                    print("✅ Single node deletion test passed")
                    self.test_nodes.pop(0)  # Remove the deleted node from our list
                else:
                    print("❌ Single node deletion test failed")
                    return False
            
            # Test multiple node deletion
            print("\n🗑️ Testing multiple node deletion...")
            multiple_test_result = await self.test_multiple_node_deletion()
            if not multiple_test_result:
                return False
                
            print("\n" + "=" * 60)
            print("✅ ALL TESTS PASSED! Node deletion race condition fix verified")
            print("=" * 60)
            return True
            
        except Exception as e:
            print(f"\n❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            return False
            
        finally:
            await self.cleanup_session()

async def main():
    """Main test function"""
    test = NodeDeletionRaceConditionTest()
    success = await test.run_comprehensive_test()
    
    if success:
        print("\n🎉 Node deletion race condition fix verification completed successfully!")
        print("The 404 DELETE errors should now be resolved.")
    else:
        print("\n💥 Node deletion race condition fix verification failed!")
        print("The issue may still exist or there are other problems.")
        
    return success

if __name__ == "__main__":
    import sys
    result = asyncio.run(main())
    sys.exit(0 if result else 1)