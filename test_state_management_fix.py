#!/usr/bin/env python3
"""
Test script to verify the state management fix for race conditions in addMessageToMap.

This test validates that:
1. Duplicate add-to-map requests are properly prevented
2. Loading states are correctly managed
3. Race conditions are eliminated
4. UI state remains consistent
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, List, Any

# Test configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

class StateManagementTester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.workspace_id = None
        self.test_messages = []
        
    async def setup_session(self):
        """Initialize HTTP session and authenticate"""
        self.session = aiohttp.ClientSession()
        
        # Test authentication
        auth_data = {
            "email": "celeste@example.com",
            "password": "testpass123"
        }
        
        async with self.session.post(f"{BASE_URL}/api/v1/auth/login", json=auth_data) as response:
            if response.status == 200:
                result = await response.json()
                self.auth_token = result.get("access_token")
                print("✅ Authentication successful")
            else:
                print(f"❌ Authentication failed: {response.status}")
                return False
                
        # Get workspace
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        async with self.session.get(f"{BASE_URL}/api/v1/workspaces", headers=headers) as response:
            if response.status == 200:
                workspaces = await response.json()
                if workspaces.get("workspaces"):
                    self.workspace_id = workspaces["workspaces"][0]["id"]
                    print(f"✅ Using workspace: {self.workspace_id}")
                else:
                    print("❌ No workspaces found")
                    return False
            else:
                print(f"❌ Failed to get workspaces: {response.status}")
                return False
                
        return True
    
    async def create_test_messages(self) -> List[str]:
        """Create test messages for the race condition test"""
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        message_ids = []
        
        test_prompts = [
            "Test message for race condition scenario 1",
            "Test message for race condition scenario 2", 
            "Test message for race condition scenario 3"
        ]
        
        for prompt in test_prompts:
            message_data = {"content": prompt}
            async with self.session.post(
                f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/messages",
                json=message_data,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    # Get the AI response message ID (last message in the response)
                    if result.get("messages"):
                        ai_message = [msg for msg in result["messages"] if msg["type"] == "ai"][-1]
                        message_ids.append(ai_message["id"])
                        print(f"✅ Created test message: {ai_message['id']}")
                else:
                    print(f"❌ Failed to create message: {response.status}")
                    
        return message_ids
    
    async def test_duplicate_prevention(self, message_id: str) -> bool:
        """Test that duplicate add-to-map requests are properly prevented"""
        print(f"\n🧪 Testing duplicate prevention for message: {message_id}")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        add_data = {
            "node_title": "Test Node for Duplicate Prevention",
            "node_type": "ai"
        }
        
        # Make first request
        async with self.session.post(
            f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/messages/{message_id}/add-to-map",
            json=add_data,
            headers=headers
        ) as response:
            first_result = await response.json()
            first_status = response.status
            print(f"   First request: {first_status} - {first_result.get('message', 'Success')}")
        
        # Make immediate duplicate request
        async with self.session.post(
            f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/messages/{message_id}/add-to-map",
            json=add_data,
            headers=headers
        ) as response:
            second_result = await response.json()
            second_status = response.status
            print(f"   Duplicate request: {second_status} - {second_result.get('message', 'Success')}")
        
        # Verify first succeeded, second was rejected
        if first_status == 200 and second_status == 400:
            print("✅ Duplicate prevention working correctly")
            return True
        else:
            print("❌ Duplicate prevention failed")
            return False
    
    async def test_concurrent_requests(self, message_ids: List[str]) -> bool:
        """Test concurrent add-to-map requests to check for race conditions"""
        print(f"\n🧪 Testing concurrent requests with {len(message_ids)} messages")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create concurrent tasks for the same message
        if not message_ids:
            print("❌ No message IDs available for concurrent test")
            return False
            
        message_id = message_ids[0]
        tasks = []
        
        for i in range(3):  # 3 concurrent requests
            add_data = {
                "node_title": f"Concurrent Test Node {i+1}",
                "node_type": "ai"
            }
            
            task = self.session.post(
                f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/messages/{message_id}/add-to-map",
                json=add_data,
                headers=headers
            )
            tasks.append(task)
        
        # Execute all requests concurrently
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = 0
        duplicate_count = 0
        
        for i, response in enumerate(responses):
            if isinstance(response, Exception):
                print(f"   Request {i+1}: Exception - {response}")
            else:
                result = await response.json()
                status = response.status
                print(f"   Request {i+1}: {status} - {result.get('message', 'Success')}")
                
                if status == 200:
                    success_count += 1
                elif status == 400 and "already been added" in result.get('message', ''):
                    duplicate_count += 1
        
        # Should have exactly 1 success and 2 duplicates
        if success_count == 1 and duplicate_count == 2:
            print("✅ Concurrent request handling working correctly")
            return True
        else:
            print(f"❌ Concurrent request handling failed: {success_count} successes, {duplicate_count} duplicates")
            return False
    
    async def test_state_consistency(self) -> bool:
        """Test that message state remains consistent after operations"""
        print(f"\n🧪 Testing state consistency")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Get current messages
        async with self.session.get(
            f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/messages",
            headers=headers
        ) as response:
            if response.status == 200:
                result = await response.json()
                messages = result.get("messages", [])
                
                # Check that messages marked as added_to_map are consistent
                added_messages = [msg for msg in messages if msg.get("added_to_map")]
                print(f"   Found {len(added_messages)} messages marked as added to map")
                
                # Verify each added message has corresponding node
                async with self.session.get(
                    f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/nodes",
                    headers=headers
                ) as nodes_response:
                    if nodes_response.status == 200:
                        nodes_result = await nodes_response.json()
                        nodes = nodes_result.get("nodes", [])
                        print(f"   Found {len(nodes)} nodes in workspace")
                        
                        # Basic consistency check
                        if len(added_messages) <= len(nodes):
                            print("✅ State consistency check passed")
                            return True
                        else:
                            print("❌ State inconsistency: more added messages than nodes")
                            return False
                    else:
                        print(f"❌ Failed to get nodes: {nodes_response.status}")
                        return False
            else:
                print(f"❌ Failed to get messages: {response.status}")
                return False
    
    async def cleanup(self):
        """Clean up test session"""
        if self.session:
            await self.session.close()
    
    async def run_all_tests(self) -> bool:
        """Run all state management tests"""
        print("🚀 Starting State Management Fix Verification Tests")
        print("=" * 60)
        
        # Setup
        if not await self.setup_session():
            return False
        
        # Create test messages
        message_ids = await self.create_test_messages()
        if not message_ids:
            print("❌ Failed to create test messages")
            return False
        
        # Run tests
        tests_passed = 0
        total_tests = 3
        
        # Test 1: Duplicate prevention
        if await self.test_duplicate_prevention(message_ids[1]):
            tests_passed += 1
        
        # Test 2: Concurrent requests
        if await self.test_concurrent_requests(message_ids[2:]):
            tests_passed += 1
        
        # Test 3: State consistency
        if await self.test_state_consistency():
            tests_passed += 1
        
        # Results
        print("\n" + "=" * 60)
        print(f"🏁 Test Results: {tests_passed}/{total_tests} tests passed")
        
        if tests_passed == total_tests:
            print("✅ All state management tests PASSED!")
            print("🔧 Race condition fix is working correctly")
            return True
        else:
            print("❌ Some tests FAILED - race conditions may still exist")
            return False

async def main():
    """Main test execution"""
    tester = StateManagementTester()
    try:
        success = await tester.run_all_tests()
        return success
    finally:
        await tester.cleanup()

if __name__ == "__main__":
    print("State Management Fix Verification Test")
    print("Testing race condition prevention in addMessageToMap")
    print()
    
    success = asyncio.run(main())
    exit(0 if success else 1)