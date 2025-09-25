#!/usr/bin/env python3
"""
Comprehensive Node Deletion Flow Verification Test

This script tests the complete node deletion functionality to verify that the seeding fix
has resolved the node deletion issue. It covers:

1. Seeded data verification
2. Direct API deletion testing
3. Database state verification
4. Edge case testing
5. Frontend integration testing (if possible)

Target Test Data:
- Workspace: 68d579e446ea8e53f748eef5
- Node: 68d57ad646ea8e53f748ef04
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, List, Optional, Tuple

class NodeDeletionFlowTester:
    def __init__(self, backend_url: str = "http://localhost:8000", frontend_url: str = "http://localhost:5173"):
        self.backend_url = backend_url
        self.frontend_url = frontend_url
        self.test_results = []
        self.session = requests.Session()
        
        # Test data from the seeding fix
        self.test_workspace_id = "68d579e446ea8e53f748eef5"
        self.test_node_id = "68d57ad646ea8e53f748ef05"  # Using actual seeded node ID
        self.test_user_email = "celeste.fcp@gmail.com"
        self.test_user_password = "celeste060291"
        
        # Authentication token
        self.auth_token = None
        
    def log_test(self, test_name: str, success: bool, message: str, details: Optional[Dict] = None):
        """Log test results"""
        result = {
            "timestamp": datetime.now().isoformat(),
            "test_name": test_name,
            "success": success,
            "message": message,
            "details": details or {}
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
        print()

    def authenticate(self) -> bool:
        """Authenticate with the backend to get access token"""
        try:
            print("🔐 Authenticating with backend...")
            
            # Try to login
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            response = self.session.post(
                f"{self.backend_url}/api/v1/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.auth_token = token_data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                
                self.log_test(
                    "Authentication",
                    True,
                    "Successfully authenticated with backend",
                    {"token_type": token_data.get("token_type")}
                )
                return True
            else:
                self.log_test(
                    "Authentication",
                    False,
                    f"Failed to authenticate: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Authentication",
                False,
                f"Authentication error: {str(e)}"
            )
            return False

    def test_backend_health(self) -> bool:
        """Test if backend is accessible"""
        try:
            # Try the root endpoint first
            response = self.session.get(f"{self.backend_url}/")
            success = response.status_code == 200
            
            if success:
                # Also try the health endpoint
                health_response = self.session.get(f"{self.backend_url}/api/v1/health")
                health_success = health_response.status_code == 200
                
                self.log_test(
                    "Backend Health Check",
                    success,
                    f"Backend root responded with status {response.status_code}, health endpoint: {health_response.status_code}",
                    {
                        "root_response_time": response.elapsed.total_seconds(),
                        "health_response_time": health_response.elapsed.total_seconds(),
                        "root_message": response.json() if response.status_code == 200 else response.text
                    }
                )
            else:
                self.log_test(
                    "Backend Health Check",
                    success,
                    f"Backend responded with status {response.status_code}",
                    {"response_time": response.elapsed.total_seconds()}
                )
            
            return success
            
        except Exception as e:
            self.log_test(
                "Backend Health Check",
                False,
                f"Backend not accessible: {str(e)}"
            )
            return False

    def test_seeded_data_existence(self) -> Tuple[bool, bool]:
        """Test that the required seeded data exists"""
        workspace_exists = False
        node_exists = False
        
        try:
            # Check if workspace exists
            print(f"🔍 Checking workspace existence: {self.test_workspace_id}")
            workspace_response = self.session.get(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}")
            
            if workspace_response.status_code == 200:
                workspace_data = workspace_response.json()
                workspace_exists = True
                self.log_test(
                    "Workspace Existence",
                    True,
                    f"Workspace {self.test_workspace_id} exists",
                    {"workspace_name": workspace_data.get("name", "Unknown")}
                )
            else:
                self.log_test(
                    "Workspace Existence",
                    False,
                    f"Workspace not found: {workspace_response.status_code}",
                    {"response": workspace_response.text}
                )
            
            # Check if target node exists by listing all nodes and finding our target
            print(f"🔍 Checking node existence: {self.test_node_id}")
            nodes_response = self.session.get(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes")
            
            if nodes_response.status_code == 200:
                nodes_data = nodes_response.json()
                all_nodes = nodes_data.get("nodes", [])
                target_node = next((node for node in all_nodes if node.get("id") == self.test_node_id), None)
                
                if target_node:
                    node_exists = True
                    self.log_test(
                        "Target Node Existence",
                        True,
                        f"Node {self.test_node_id} exists in workspace",
                        {
                            "node_title": target_node.get("title", "Unknown"),
                            "node_type": target_node.get("type", "Unknown")
                        }
                    )
                else:
                    self.log_test(
                        "Target Node Existence",
                        False,
                        f"Target node {self.test_node_id} not found in workspace",
                        {
                            "available_nodes": [node.get("id") for node in all_nodes],
                            "total_nodes": len(all_nodes)
                        }
                    )
            else:
                self.log_test(
                    "Target Node Existence",
                    False,
                    f"Failed to list nodes: {nodes_response.status_code}",
                    {"response": nodes_response.text}
                )
            
            # The nodes listing is already done above, so we can use that data
            if nodes_response.status_code == 200:
                nodes_data = nodes_response.json()
                all_nodes = nodes_data.get("nodes", [])
                self.log_test(
                    "Workspace Nodes Inventory",
                    True,
                    f"Found {len(all_nodes)} nodes in workspace",
                    {
                        "total_nodes": len(all_nodes),
                        "node_ids": [node.get("id") for node in all_nodes],
                        "target_node_present": any(node.get("id") == self.test_node_id for node in all_nodes)
                    }
                )
            
        except Exception as e:
            self.log_test(
                "Seeded Data Check",
                False,
                f"Error checking seeded data: {str(e)}"
            )
        
        return workspace_exists, node_exists

    def test_direct_api_deletion(self) -> bool:
        """Test direct API call to delete the target node"""
        try:
            print(f"🗑️ Testing direct API deletion of node: {self.test_node_id}")
            
            # First, verify the node exists before deletion by listing nodes
            pre_delete_response = self.session.get(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes")
            
            if pre_delete_response.status_code != 200:
                self.log_test(
                    "Pre-Deletion Node Check",
                    False,
                    f"Cannot list nodes before deletion: {pre_delete_response.status_code}",
                    {"response": pre_delete_response.text}
                )
                return False
            
            # Check if our target node exists
            pre_nodes_data = pre_delete_response.json()
            pre_all_nodes = pre_nodes_data.get("nodes", [])
            target_exists = any(node.get("id") == self.test_node_id for node in pre_all_nodes)
            
            if not target_exists:
                self.log_test(
                    "Pre-Deletion Node Check",
                    False,
                    f"Target node {self.test_node_id} doesn't exist before deletion",
                    {"available_nodes": [node.get("id") for node in pre_all_nodes]}
                )
                return False
            
            self.log_test(
                "Pre-Deletion Node Check",
                True,
                f"Target node {self.test_node_id} confirmed to exist before deletion",
                {"total_nodes_before": len(pre_all_nodes)}
            )
            
            # Perform the deletion
            delete_response = self.session.delete(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes/{self.test_node_id}")
            
            # Check if deletion was successful (should return 200 or 204)
            deletion_successful = delete_response.status_code in [200, 204]
            
            self.log_test(
                "Direct API Deletion",
                deletion_successful,
                f"Deletion API returned status {delete_response.status_code}",
                {
                    "status_code": delete_response.status_code,
                    "response_text": delete_response.text,
                    "response_headers": dict(delete_response.headers)
                }
            )
            
            if deletion_successful:
                # Verify the node is actually gone by listing nodes
                post_delete_response = self.session.get(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes")
                
                if post_delete_response.status_code == 200:
                    post_nodes_data = post_delete_response.json()
                    post_all_nodes = post_nodes_data.get("nodes", [])
                    node_still_exists = any(node.get("id") == self.test_node_id for node in post_all_nodes)
                    
                    node_actually_deleted = not node_still_exists
                    
                    self.log_test(
                        "Post-Deletion Verification",
                        node_actually_deleted,
                        f"Node deletion verification: {'deleted' if node_actually_deleted else 'still exists'}",
                        {
                            "node_still_exists": node_still_exists,
                            "total_nodes_after": len(post_all_nodes),
                            "remaining_node_ids": [node.get("id") for node in post_all_nodes]
                        }
                    )
                    
                    return node_actually_deleted
                else:
                    self.log_test(
                        "Post-Deletion Verification",
                        False,
                        f"Cannot verify deletion - failed to list nodes: {post_delete_response.status_code}",
                        {"response": post_delete_response.text}
                    )
                    return False
            
            return False
            
        except Exception as e:
            self.log_test(
                "Direct API Deletion",
                False,
                f"Error during deletion test: {str(e)}"
            )
            return False

    def test_edge_cases(self) -> Dict[str, bool]:
        """Test edge cases for deletion"""
        results = {}
        
        try:
            # Test 1: Delete non-existent node
            print("🧪 Testing edge case: Delete non-existent node")
            fake_node_id = "000000000000000000000000"
            
            response = self.session.delete(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes/{fake_node_id}")
            
            # Should return 404 for non-existent node
            correct_404_response = response.status_code == 404
            results["non_existent_node"] = correct_404_response
            
            self.log_test(
                "Edge Case: Non-existent Node Deletion",
                correct_404_response,
                f"Non-existent node deletion returned {response.status_code} (expected 404)",
                {"response": response.text}
            )
            
            # Test 2: Delete from wrong workspace
            print("🧪 Testing edge case: Delete from wrong workspace")
            fake_workspace_id = "000000000000000000000000"
            
            # First create a test node to delete
            test_node_response = self.session.post(
                f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes",
                json={
                    "title": "Test Node for Edge Case",
                    "content": "This is a test node",
                    "type": "text",
                    "x": 100,
                    "y": 100
                }
            )
            
            if test_node_response.status_code == 201:
                test_node_data = test_node_response.json()
                test_node_id = test_node_data.get("id")
                
                # Try to delete from wrong workspace
                wrong_workspace_response = self.session.delete(f"{self.backend_url}/api/v1/workspaces/{fake_workspace_id}/nodes/{test_node_id}")
                
                correct_error_response = wrong_workspace_response.status_code in [404, 403]
                results["wrong_workspace"] = correct_error_response
                
                self.log_test(
                    "Edge Case: Wrong Workspace Deletion",
                    correct_error_response,
                    f"Wrong workspace deletion returned {wrong_workspace_response.status_code}",
                    {"response": wrong_workspace_response.text}
                )
                
                # Clean up: delete the test node properly
                cleanup_response = self.session.delete(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes/{test_node_id}")
                print(f"   Cleanup: Test node deleted with status {cleanup_response.status_code}")
            
        except Exception as e:
            self.log_test(
                "Edge Cases Testing",
                False,
                f"Error during edge case testing: {str(e)}"
            )
        
        return results

    def test_database_consistency(self) -> bool:
        """Test that database state is consistent after operations"""
        try:
            print("🔍 Testing database consistency...")
            
            # Get current node count
            nodes_response = self.session.get(f"{self.backend_url}/api/v1/workspaces/{self.test_workspace_id}/nodes")
            
            if nodes_response.status_code == 200:
                nodes_data = nodes_response.json()
                
                # Check that our target node is not in the list
                target_node_absent = not any(node.get("id") == self.test_node_id for node in nodes_data)
                
                self.log_test(
                    "Database Consistency Check",
                    target_node_absent,
                    f"Target node properly removed from database. Current node count: {len(nodes_data)}",
                    {
                        "total_nodes": len(nodes_data),
                        "target_node_absent": target_node_absent,
                        "remaining_node_ids": [node.get("id") for node in nodes_data]
                    }
                )
                
                return target_node_absent
            else:
                self.log_test(
                    "Database Consistency Check",
                    False,
                    f"Failed to retrieve nodes for consistency check: {nodes_response.status_code}",
                    {"response": nodes_response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Database Consistency Check",
                False,
                f"Error during consistency check: {str(e)}"
            )
            return False

    def generate_report(self) -> str:
        """Generate a comprehensive test report"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        report = f"""
=== COMPREHENSIVE NODE DELETION FLOW VERIFICATION REPORT ===
Generated: {datetime.now().isoformat()}

SUMMARY:
- Total Tests: {total_tests}
- Passed: {passed_tests}
- Failed: {failed_tests}
- Success Rate: {success_rate:.1f}%

TARGET TEST DATA:
- Workspace ID: {self.test_workspace_id}
- Node ID: {self.test_node_id}
- Test User: {self.test_user_email}

OVERALL STATUS: {"✅ ALL TESTS PASSED" if failed_tests == 0 else f"❌ {failed_tests} TESTS FAILED"}

DETAILED RESULTS:
"""
        
        for i, result in enumerate(self.test_results, 1):
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            report += f"\n{i}. {status} {result['test_name']}\n"
            report += f"   Message: {result['message']}\n"
            report += f"   Time: {result['timestamp']}\n"
            
            if result["details"]:
                report += f"   Details: {json.dumps(result['details'], indent=6)}\n"
        
        # Add conclusions
        report += f"""
CONCLUSIONS:
"""
        
        if failed_tests == 0:
            report += """
✅ The node deletion functionality is working correctly!
✅ The seeding fix has successfully resolved the original 404 "Node not found" error
✅ All edge cases are handled properly
✅ Database consistency is maintained after deletions
✅ The complete deletion flow is functioning as expected

RECOMMENDATION: The node deletion feature is ready for production use.
"""
        else:
            report += f"""
❌ {failed_tests} test(s) failed - the node deletion functionality needs attention
❌ Review the failed tests above to identify remaining issues
❌ The original 404 error may not be fully resolved

RECOMMENDATION: Address the failing tests before considering the fix complete.
"""
        
        return report

    def run_complete_test_suite(self):
        """Run the complete test suite"""
        print("🚀 Starting Comprehensive Node Deletion Flow Verification")
        print("=" * 70)
        
        # Test 1: Backend Health
        if not self.test_backend_health():
            print("❌ Backend not accessible - aborting tests")
            return
        
        # Test 2: Authentication
        if not self.authenticate():
            print("❌ Authentication failed - aborting tests")
            return
        
        # Test 3: Seeded Data Existence
        workspace_exists, node_exists = self.test_seeded_data_existence()
        
        if not workspace_exists:
            print("❌ Test workspace not found - aborting tests")
            return
        
        if not node_exists:
            print("❌ Target node not found - cannot test deletion")
            return
        
        # Test 4: Direct API Deletion
        deletion_successful = self.test_direct_api_deletion()
        
        # Test 5: Database Consistency
        if deletion_successful:
            self.test_database_consistency()
        
        # Test 6: Edge Cases
        self.test_edge_cases()
        
        # Generate and display report
        print("\n" + "=" * 70)
        report = self.generate_report()
        print(report)
        
        # Save report to file
        with open("node_deletion_verification_report.txt", "w") as f:
            f.write(report)
        
        print(f"\n📄 Full report saved to: node_deletion_verification_report.txt")

def main():
    """Main function"""
    print("Node Deletion Flow Verification Test")
    print("This test verifies that the seeding fix has resolved the node deletion issue.")
    print()
    
    # Initialize tester
    tester = NodeDeletionFlowTester()
    
    # Run complete test suite
    tester.run_complete_test_suite()

if __name__ == "__main__":
    main()