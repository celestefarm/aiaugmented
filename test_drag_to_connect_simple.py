#!/usr/bin/env python3
"""
Simple Drag-to-Connect Test

This script creates a test user and tests the drag-to-connect functionality.
"""

import requests
import json
import time
import sys
import os

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Configuration
BASE_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5173"

# Test user credentials
TEST_EMAIL = "dragtest@example.com"
TEST_PASSWORD = "dragtest123"

class SimpleDragTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.workspace_id = None
        self.test_nodes = []
        
    def create_test_user(self) -> bool:
        """Create a test user for drag testing"""
        print("👤 Creating test user...")
        
        try:
            response = self.session.post(f"{BASE_URL}/api/v1/auth/signup", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Drag Test User"
            })
            
            if response.status_code == 201:
                print("✅ Test user created successfully")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                print("✅ Test user already exists")
                return True
            else:
                print(f"❌ Failed to create user: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ User creation error: {e}")
            return False
    
    def login(self) -> bool:
        """Login with test user"""
        print("🔐 Logging in...")
        
        try:
            response = self.session.post(f"{BASE_URL}/api/v1/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                if self.token:
                    self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                    print("✅ Login successful")
                    return True
                else:
                    print("❌ No access token in response")
                    return False
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_workspace(self) -> bool:
        """Get or create workspace"""
        print("🏢 Getting workspace...")
        
        try:
            response = self.session.get(f"{BASE_URL}/api/v1/workspaces")
            
            if response.status_code == 200:
                workspaces = response.json()
                print(f"📊 Workspaces response: {workspaces}")
                
                # Handle both direct list and wrapped response
                workspace_list = workspaces if isinstance(workspaces, list) else workspaces.get('workspaces', [])
                
                if len(workspace_list) > 0:
                    self.workspace_id = workspace_list[0]["id"]
                    print(f"✅ Using existing workspace: {self.workspace_id}")
                    return True
                else:
                    print("📝 No workspaces found, creating new workspace...")
                    # Create a workspace
                    response = self.session.post(f"{BASE_URL}/api/v1/workspaces", json={
                        "title": "Drag Test Workspace",
                        "description": "Workspace for testing drag-to-connect functionality"
                    })
                    print(f"📊 Create workspace response: {response.status_code} - {response.text}")
                    if response.status_code == 201:
                        workspace = response.json()
                        self.workspace_id = workspace["id"]
                        print(f"✅ Created workspace: {self.workspace_id}")
                        return True
                    else:
                        print(f"❌ Failed to create workspace: {response.status_code} - {response.text}")
                        return False
            else:
                print(f"❌ Failed to get workspaces: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Workspace error: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    def create_test_nodes(self) -> bool:
        """Create test nodes for connection testing"""
        print("📝 Creating test nodes...")
        
        test_node_data = [
            {
                "title": "Node A",
                "description": "First node for drag-to-connect testing",
                "type": "human",
                "x": 100,
                "y": 100
            },
            {
                "title": "Node B", 
                "description": "Second node for drag-to-connect testing",
                "type": "human",
                "x": 300,
                "y": 200
            }
        ]
        
        try:
            for i, node_data in enumerate(test_node_data):
                response = self.session.post(
                    f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/nodes",
                    json=node_data
                )
                
                if response.status_code == 201:
                    node = response.json()
                    self.test_nodes.append(node)
                    print(f"✅ Created node {i+1}: {node['title']} (ID: {node['id']})")
                else:
                    print(f"❌ Failed to create node {i+1}: {response.status_code} - {response.text}")
                    return False
            
            print(f"✅ Created {len(self.test_nodes)} test nodes")
            return True
            
        except Exception as e:
            print(f"❌ Node creation error: {e}")
            return False
    
    def test_edge_creation(self) -> bool:
        """Test edge creation between nodes"""
        print("🔗 Testing edge creation...")
        
        if len(self.test_nodes) < 2:
            print("❌ Need at least 2 nodes for edge creation")
            return False
        
        try:
            edge_data = {
                "from_node_id": self.test_nodes[0]["id"],
                "to_node_id": self.test_nodes[1]["id"],
                "type": "support",
                "description": "Test connection via drag-to-connect"
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/v1/workspaces/{self.workspace_id}/edges",
                json=edge_data
            )
            
            if response.status_code == 201:
                edge = response.json()
                print(f"✅ Edge created successfully:")
                print(f"   Response: {edge}")
                # Handle different response formats
                edge_id = edge.get('id') or edge.get('_id') or 'unknown'
                from_id = edge.get('from_node_id', 'unknown')
                to_id = edge.get('to_node_id', 'unknown')
                edge_type = edge.get('type', 'unknown')
                print(f"   ID: {edge_id}")
                print(f"   From: {from_id} → To: {to_id}")
                print(f"   Type: {edge_type}")
                return True
            else:
                print(f"❌ Edge creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Edge creation error: {e}")
            return False
    
    def run_test(self) -> bool:
        """Run the complete test"""
        print("🚀 Starting Drag-to-Connect Test")
        print("=" * 50)
        
        # Step 1: Create test user
        if not self.create_test_user():
            return False
        
        # Step 2: Login
        if not self.login():
            return False
        
        # Step 3: Get workspace
        if not self.get_workspace():
            return False
        
        # Step 4: Create test nodes
        if not self.create_test_nodes():
            return False
        
        # Step 5: Test edge creation
        if not self.test_edge_creation():
            return False
        
        print("=" * 50)
        print("🎉 DRAG-TO-CONNECT TEST PASSED!")
        print()
        print("✅ Backend APIs working correctly")
        print("✅ Node creation successful")
        print("✅ Edge creation successful")
        print("✅ Ready for frontend testing")
        print()
        print("🎯 MANUAL TEST INSTRUCTIONS:")
        print(f"   1. Open {FRONTEND_URL}")
        print(f"   2. Login with: {TEST_EMAIL} / {TEST_PASSWORD}")
        print("   3. Click 'Connect Nodes' button")
        print("   4. Try both connection methods:")
        print("      • Drag from one node to another")
        print("      • Ctrl+click first node, then Ctrl+click second node")
        print("   5. Verify connection is created")
        
        return True

def main():
    """Main test execution"""
    tester = SimpleDragTester()
    
    try:
        success = tester.run_test()
        if success:
            print("\n🎊 TEST PASSED - READY FOR MANUAL TESTING!")
            exit(0)
        else:
            print("\n❌ TEST FAILED")
            exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)

if __name__ == "__main__":
    main()