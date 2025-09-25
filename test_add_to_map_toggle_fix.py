#!/usr/bin/env python3
"""
Test script to verify the Add to Map toggle fix works correctly.
This script tests that both AI agent and human chat nodes properly toggle
between "Add to map" and "Added to map" states when nodes are deleted.
"""

import requests
import json
import time
from typing import Dict, List, Optional

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
FRONTEND_URL = "http://localhost:3000"

class AddToMapToggleTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.workspace_id = None
        self.test_user = {
            "email": "test_toggle@example.com",
            "password": "testpassword123",
            "name": "Toggle Test User"
        }
    
    def setup_test_environment(self):
        """Set up test user and workspace"""
        print("🔧 Setting up test environment...")
        
        # Create or login test user
        try:
            # Try to login first
            login_response = self.session.post(
                f"{API_BASE_URL}/auth/login",
                json={
                    "email": self.test_user["email"],
                    "password": self.test_user["password"]
                }
            )
            
            if login_response.status_code == 200:
                print("✅ Logged in existing test user")
            else:
                # Create new user
                signup_response = self.session.post(
                    f"{API_BASE_URL}/auth/signup",
                    json=self.test_user
                )
                if signup_response.status_code == 200:
                    print("✅ Created new test user")
                    login_response = signup_response
                elif signup_response.status_code == 400 and "already exists" in signup_response.text.lower():
                    # User already exists, try login again
                    print("⚠️ User already exists, trying login again...")
                    login_response = self.session.post(
                        f"{API_BASE_URL}/auth/login",
                        json={
                            "email": self.test_user["email"],
                            "password": self.test_user["password"]
                        }
                    )
                    if login_response.status_code != 200:
                        raise Exception(f"Failed to login existing user: {login_response.text}")
                else:
                    print(f"⚠️ Signup response: {signup_response.status_code} - {signup_response.text[:200]}")
                    # If we got a token in the response, it might be successful despite the error
                    try:
                        signup_data = signup_response.json()
                        if "access_token" in signup_data:
                            print("✅ Found token in signup response, proceeding...")
                            login_response = signup_response
                        else:
                            raise Exception(f"Failed to create user: {signup_response.text}")
                    except:
                        raise Exception(f"Failed to create user: {signup_response.text}")
            
            # Extract token
            auth_data = login_response.json()
            self.auth_token = auth_data["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            print(f"✅ Authentication successful")
            
        except Exception as e:
            print(f"❌ Authentication failed: {e}")
            return False
        
        # Create test workspace
        try:
            workspace_response = self.session.post(
                f"{API_BASE_URL}/workspaces",
                json={
                    "title": "Add to Map Toggle Test Workspace",
                    "settings": {"active_agents": ["strategist"]}
                }
            )
            
            if workspace_response.status_code == 200:
                workspace_data = workspace_response.json()
                self.workspace_id = workspace_data["id"]
                print(f"✅ Created test workspace: {self.workspace_id}")
            else:
                print(f"⚠️ Workspace response: {workspace_response.status_code} - {workspace_response.text[:200]}")
                # Check if we got workspace data despite the status code
                try:
                    workspace_data = workspace_response.json()
                    if "id" in workspace_data:
                        self.workspace_id = workspace_data["id"]
                        print(f"✅ Found workspace ID in response, proceeding: {self.workspace_id}")
                    else:
                        raise Exception(f"Failed to create workspace: {workspace_response.text}")
                except:
                    raise Exception(f"Failed to create workspace: {workspace_response.text}")
                
        except Exception as e:
            print(f"❌ Workspace creation failed: {e}")
            return False
        
        return True
    
    def activate_strategist_agent(self):
        """Activate the strategist agent for testing"""
        print("🤖 Activating strategist agent...")
        
        try:
            activate_response = self.session.post(
                f"{API_BASE_URL}/workspaces/{self.workspace_id}/agents/strategist/activate"
            )
            
            if activate_response.status_code in [200, 204]:
                print("✅ Strategist agent activated")
                return True
            else:
                print(f"⚠️ Agent activation returned: {activate_response.status_code}")
                return True  # Continue anyway, might already be active
                
        except Exception as e:
            print(f"❌ Agent activation failed: {e}")
            return False
    
    def send_test_messages(self) -> List[Dict]:
        """Send test messages to create both human and AI messages"""
        print("💬 Sending test messages...")
        
        messages = []
        test_prompts = [
            "What are the key strategic considerations for launching a new product?",
            "How should we approach market research for this initiative?",
            "What are the potential risks we should consider?"
        ]
        
        for i, prompt in enumerate(test_prompts):
            try:
                print(f"  📝 Sending message {i+1}: {prompt[:50]}...")
                
                message_response = self.session.post(
                    f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages",
                    json={"content": prompt}
                )
                
                if message_response.status_code == 200:
                    response_messages = message_response.json()
                    messages.extend(response_messages)
                    print(f"  ✅ Received {len(response_messages)} messages")
                    
                    # Wait a bit between messages
                    time.sleep(1)
                else:
                    print(f"  ❌ Message failed: {message_response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ Message error: {e}")
        
        print(f"✅ Total messages created: {len(messages)}")
        return messages
    
    def test_add_to_map_functionality(self, messages: List[Dict]):
        """Test the add to map and delete node toggle functionality"""
        print("🗺️ Testing Add to Map toggle functionality...")
        
        test_results = []
        
        for i, message in enumerate(messages[:4]):  # Test first 4 messages
            message_id = message["id"]
            message_type = message["type"]
            message_content = message["content"][:50]
            
            print(f"\n--- Test {i+1}: {message_type.upper()} message ---")
            print(f"Message ID: {message_id}")
            print(f"Content: {message_content}...")
            
            # Step 1: Add message to map
            print("  📍 Step 1: Adding message to map...")
            try:
                add_response = self.session.post(
                    f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages/{message_id}/add-to-map",
                    json={"node_type": message_type}
                )
                
                if add_response.status_code == 200:
                    add_data = add_response.json()
                    if add_data.get("success"):
                        node_id = add_data.get("node_id")
                        print(f"  ✅ Successfully added to map, node ID: {node_id}")
                        
                        # Step 2: Verify message state changed
                        print("  🔍 Step 2: Verifying message state...")
                        messages_response = self.session.get(
                            f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages"
                        )
                        
                        if messages_response.status_code == 200:
                            current_messages = messages_response.json()["messages"]
                            updated_message = next((m for m in current_messages if m["id"] == message_id), None)
                            
                            if updated_message and updated_message.get("added_to_map"):
                                print("  ✅ Message state correctly shows 'added_to_map: true'")
                                
                                # Step 3: Delete the node
                                print("  🗑️ Step 3: Deleting node from canvas...")
                                delete_response = self.session.delete(
                                    f"{API_BASE_URL}/workspaces/{self.workspace_id}/nodes/{node_id}"
                                )
                                
                                if delete_response.status_code in [200, 204]:
                                    print("  ✅ Node deleted successfully")
                                    
                                    # Wait a moment for backend processing
                                    time.sleep(1)
                                    
                                    # Step 4: Verify message state reverted
                                    print("  🔍 Step 4: Verifying message state reverted...")
                                    final_messages_response = self.session.get(
                                        f"{API_BASE_URL}/workspaces/{self.workspace_id}/messages"
                                    )
                                    
                                    if final_messages_response.status_code == 200:
                                        final_messages = final_messages_response.json()["messages"]
                                        final_message = next((m for m in final_messages if m["id"] == message_id), None)
                                        
                                        if final_message:
                                            is_reverted = not final_message.get("added_to_map", True)
                                            if is_reverted:
                                                print("  ✅ SUCCESS: Message state correctly reverted to 'added_to_map: false'")
                                                test_results.append({
                                                    "message_type": message_type,
                                                    "message_id": message_id,
                                                    "status": "PASS",
                                                    "details": "Add/delete toggle works correctly"
                                                })
                                            else:
                                                print("  ❌ FAIL: Message state did NOT revert - still shows 'added_to_map: true'")
                                                test_results.append({
                                                    "message_type": message_type,
                                                    "message_id": message_id,
                                                    "status": "FAIL",
                                                    "details": "Message state did not revert after node deletion"
                                                })
                                        else:
                                            print("  ❌ FAIL: Could not find message after node deletion")
                                            test_results.append({
                                                "message_type": message_type,
                                                "message_id": message_id,
                                                "status": "FAIL",
                                                "details": "Message not found after node deletion"
                                            })
                                    else:
                                        print(f"  ❌ Failed to get final messages: {final_messages_response.status_code}")
                                else:
                                    print(f"  ❌ Node deletion failed: {delete_response.status_code}")
                            else:
                                print("  ❌ FAIL: Message state did not change to 'added_to_map: true'")
                        else:
                            print(f"  ❌ Failed to verify message state: {messages_response.status_code}")
                    else:
                        print(f"  ❌ Add to map failed: {add_data.get('message', 'Unknown error')}")
                else:
                    print(f"  ❌ Add to map request failed: {add_response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ Test error: {e}")
                test_results.append({
                    "message_type": message_type,
                    "message_id": message_id,
                    "status": "ERROR",
                    "details": str(e)
                })
        
        return test_results
    
    def print_test_summary(self, results: List[Dict]):
        """Print a summary of test results"""
        print("\n" + "="*60)
        print("🧪 ADD TO MAP TOGGLE TEST SUMMARY")
        print("="*60)
        
        total_tests = len(results)
        passed_tests = len([r for r in results if r["status"] == "PASS"])
        failed_tests = len([r for r in results if r["status"] == "FAIL"])
        error_tests = len([r for r in results if r["status"] == "ERROR"])
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"⚠️ Errors: {error_tests}")
        
        if passed_tests == total_tests:
            print("\n🎉 ALL TESTS PASSED! The Add to Map toggle fix is working correctly.")
            print("Both AI agent and human chat nodes properly toggle between states.")
        else:
            print(f"\n⚠️ {failed_tests + error_tests} test(s) failed. Details:")
            for result in results:
                if result["status"] != "PASS":
                    print(f"  - {result['message_type'].upper()} message: {result['details']}")
        
        print("\nDetailed Results:")
        for i, result in enumerate(results, 1):
            status_icon = "✅" if result["status"] == "PASS" else "❌" if result["status"] == "FAIL" else "⚠️"
            print(f"  {i}. {status_icon} {result['message_type'].upper()} message ({result['message_id'][:8]}...): {result['status']}")
    
    def cleanup(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        if self.workspace_id:
            try:
                # Delete workspace (this will cascade delete all nodes, edges, and messages)
                delete_response = self.session.delete(
                    f"{API_BASE_URL}/workspaces/{self.workspace_id}"
                )
                
                if delete_response.status_code in [200, 204]:
                    print("✅ Test workspace deleted")
                else:
                    print(f"⚠️ Workspace deletion returned: {delete_response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ Cleanup error: {e}")
    
    def run_full_test(self):
        """Run the complete test suite"""
        print("🚀 Starting Add to Map Toggle Fix Test")
        print("="*50)
        
        # Setup
        if not self.setup_test_environment():
            print("❌ Test setup failed, aborting")
            return False
        
        if not self.activate_strategist_agent():
            print("❌ Agent activation failed, aborting")
            return False
        
        # Create test messages
        messages = self.send_test_messages()
        if not messages:
            print("❌ No messages created, aborting")
            return False
        
        # Run toggle tests
        results = self.test_add_to_map_functionality(messages)
        
        # Print summary
        self.print_test_summary(results)
        
        # Cleanup
        self.cleanup()
        
        # Return overall success
        return all(r["status"] == "PASS" for r in results)

def main():
    """Main test execution"""
    print("🧪 Add to Map Toggle Fix Verification Test")
    print("This test verifies that the 'Add to map' button correctly toggles")
    print("between 'Add to map' and 'Added to map' for both AI and human messages")
    print("when nodes are deleted from the canvas.\n")
    
    tester = AddToMapToggleTest()
    success = tester.run_full_test()
    
    if success:
        print("\n🎉 OVERALL RESULT: SUCCESS - Fix is working correctly!")
        exit(0)
    else:
        print("\n❌ OVERALL RESULT: FAILURE - Fix needs more work")
        exit(1)

if __name__ == "__main__":
    main()