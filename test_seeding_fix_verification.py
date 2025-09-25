#!/usr/bin/env python3
"""
Test script to verify that the seeding fix creates the exact data needed for deletion tests.
This script will test the complete node deletion flow with the seeded data.
"""

import asyncio
import requests
import json
from datetime import datetime

# Test configuration
BACKEND_URL = "http://localhost:8000"
TARGET_WORKSPACE_ID = "68d579e446ea8e53f748eef5"
TARGET_NODE_ID = "68d57ad646ea8e53f748ef04"
TEST_USER_EMAIL = "celeste.fcp@gmail.com"
TEST_USER_PASSWORD = "celeste060291"

class NodeDeletionTestVerifier:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def test_backend_health(self):
        """Test if backend is running and healthy"""
        try:
            response = self.session.get(f"{BACKEND_URL}/api/v1/healthz", timeout=5)
            if response.status_code == 200:
                self.log("✅ Backend is healthy and running")
                return True
            else:
                self.log(f"❌ Backend health check failed: {response.status_code}")
                return False
        except Exception as e:
            self.log(f"❌ Cannot connect to backend: {e}")
            return False
    
    def authenticate(self):
        """Authenticate with the test user"""
        try:
            auth_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/api/v1/auth/login",
                json=auth_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                if self.auth_token:
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.auth_token}"
                    })
                    self.log("✅ Successfully authenticated")
                    return True
                else:
                    self.log("❌ No access token in response")
                    return False
            else:
                self.log(f"❌ Authentication failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Authentication error: {e}")
            return False
    
    def verify_workspace_exists(self):
        """Verify that the target workspace exists"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/api/v1/workspaces/{TARGET_WORKSPACE_ID}",
                timeout=10
            )
            
            if response.status_code == 200:
                workspace = response.json()
                self.log(f"✅ Target workspace exists: '{workspace.get('title', 'Unknown')}'")
                self.log(f"   Workspace ID: {TARGET_WORKSPACE_ID}")
                self.log(f"   Owner ID: {workspace.get('owner_id', 'Unknown')}")
                return True
            else:
                self.log(f"❌ Target workspace not found: {response.status_code}")
                if response.status_code == 404:
                    self.log("   This means the seeding didn't create the workspace properly")
                return False
                
        except Exception as e:
            self.log(f"❌ Error checking workspace: {e}")
            return False
    
    def verify_node_exists(self):
        """Verify that the target node exists"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/api/v1/workspaces/{TARGET_WORKSPACE_ID}/nodes",
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Handle NodeListResponse format: {"nodes": [...], "total": N}
                if isinstance(response_data, dict) and "nodes" in response_data:
                    nodes = response_data["nodes"]
                    total = response_data.get("total", len(nodes))
                else:
                    # Fallback for direct array response
                    nodes = response_data if isinstance(response_data, list) else []
                    total = len(nodes)
                
                self.log(f"✅ Found {total} nodes in workspace")
                
                # Look for our specific target node
                target_node = None
                for node in nodes:
                    # Handle both dict and string cases
                    if isinstance(node, dict):
                        node_id = node.get("_id") or node.get("id")
                    else:
                        # If node is a string, it might be the ID itself
                        node_id = str(node)
                    
                    if node_id == TARGET_NODE_ID:
                        target_node = node
                        break
                
                if target_node:
                    self.log(f"✅ Target node exists: '{target_node.get('title', 'Unknown')}'")
                    self.log(f"   Node ID: {TARGET_NODE_ID}")
                    self.log(f"   Node Type: {target_node.get('type', 'Unknown')}")
                    self.log(f"   Description: {target_node.get('description', 'No description')[:50]}...")
                    return True
                else:
                    self.log(f"❌ Target node {TARGET_NODE_ID} not found in workspace")
                    self.log("   Available nodes:")
                    for node in nodes:
                        if isinstance(node, dict):
                            node_id = node.get("_id") or node.get("id")
                            title = node.get('title', 'Unknown')
                        else:
                            node_id = str(node)
                            title = 'Unknown'
                        self.log(f"     - {node_id}: {title}")
                    return False
            else:
                self.log(f"❌ Failed to get nodes: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error checking nodes: {e}")
            return False
    
    def test_node_deletion(self):
        """Test the actual node deletion"""
        try:
            response = self.session.delete(
                f"{BACKEND_URL}/api/v1/workspaces/{TARGET_WORKSPACE_ID}/nodes/{TARGET_NODE_ID}",
                timeout=10
            )
            
            if response.status_code == 204:
                self.log("✅ Node deletion successful!")
                self.log("   HTTP 204 No Content - node deleted successfully")
                return True
            elif response.status_code == 200:
                self.log("✅ Node deletion successful!")
                result = response.json()
                self.log(f"   Deletion result: {result}")
                return True
            else:
                self.log(f"❌ Node deletion failed: {response.status_code}")
                self.log(f"   Response: {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error during node deletion: {e}")
            return False
    
    def verify_node_deleted(self):
        """Verify that the node was actually deleted"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/api/v1/workspaces/{TARGET_WORKSPACE_ID}/nodes",
                timeout=10
            )
            
            if response.status_code == 200:
                response_data = response.json()
                
                # Handle NodeListResponse format: {"nodes": [...], "total": N}
                if isinstance(response_data, dict) and "nodes" in response_data:
                    nodes = response_data["nodes"]
                    total = response_data.get("total", len(nodes))
                else:
                    # Fallback for direct array response
                    nodes = response_data if isinstance(response_data, list) else []
                    total = len(nodes)
                
                # Check if target node still exists
                target_node_exists = any(
                    (node.get("_id") or node.get("id")) == TARGET_NODE_ID
                    for node in nodes
                    if isinstance(node, dict)
                )
                
                if not target_node_exists:
                    self.log("✅ Node successfully deleted - no longer exists in workspace")
                    self.log(f"   Remaining nodes in workspace: {total}")
                    return True
                else:
                    self.log("❌ Node still exists after deletion attempt")
                    return False
            else:
                self.log(f"❌ Failed to verify deletion: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Error verifying deletion: {e}")
            return False
    
    def run_complete_test(self):
        """Run the complete verification test"""
        self.log("🧪 Starting Node Deletion Seeding Fix Verification")
        self.log("=" * 60)
        
        # Test steps
        steps = [
            ("Backend Health Check", self.test_backend_health),
            ("User Authentication", self.authenticate),
            ("Workspace Verification", self.verify_workspace_exists),
            ("Node Verification", self.verify_node_exists),
            ("Node Deletion Test", self.test_node_deletion),
            ("Deletion Verification", self.verify_node_deleted),
        ]
        
        results = {}
        for step_name, step_func in steps:
            self.log(f"\n🔍 {step_name}...")
            try:
                result = step_func()
                results[step_name] = result
                if not result:
                    self.log(f"❌ {step_name} failed - stopping test")
                    break
            except Exception as e:
                self.log(f"❌ {step_name} error: {e}")
                results[step_name] = False
                break
        
        # Summary
        self.log("\n" + "=" * 60)
        self.log("🎯 TEST SUMMARY")
        self.log("=" * 60)
        
        all_passed = True
        for step_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status}: {step_name}")
            if not result:
                all_passed = False
        
        if all_passed:
            self.log("\n🎉 ALL TESTS PASSED!")
            self.log("✅ The seeding fix successfully creates the required test data")
            self.log("✅ Node deletion functionality works correctly")
            self.log("✅ The original problem has been resolved")
        else:
            self.log("\n❌ SOME TESTS FAILED")
            self.log("❌ The seeding fix needs additional work")
        
        return all_passed


def main():
    """Main test function"""
    verifier = NodeDeletionTestVerifier()
    success = verifier.run_complete_test()
    
    if success:
        print("\n🎯 CONCLUSION: The test data seeding issue has been successfully fixed!")
        exit(0)
    else:
        print("\n❌ CONCLUSION: The seeding fix needs more work.")
        exit(1)


if __name__ == "__main__":
    main()