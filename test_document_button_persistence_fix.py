#!/usr/bin/env python3
"""
Document Button State Persistence Fix Verification
Tests that document upload button states persist correctly across login/logout cycles
"""

import requests
import json
import time
import sys
from pathlib import Path

# API Configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "password123"

class DocumentButtonPersistenceTest:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.workspace_id = None
        self.test_document_id = None
        self.test_node_id = None
        self.document_message_id = None
        
    def log(self, message, level="INFO"):
        """Enhanced logging with timestamps"""
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def login(self):
        """Login and get auth token"""
        self.log("=== STEP 1: LOGIN ===")
        
        response = self.session.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data.get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            self.log(f"✅ Login successful")
            return True
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def logout(self):
        """Logout and clear session"""
        self.log("=== LOGOUT ===")
        self.session.headers.pop("Authorization", None)
        self.auth_token = None
        self.log("✅ Logged out, session cleared")
        
    def get_workspace(self):
        """Get or create a test workspace"""
        self.log("=== STEP 2: GET WORKSPACE ===")
        
        # Get workspaces
        response = self.session.get(f"{BASE_URL}/workspaces")
        if response.status_code != 200:
            self.log(f"❌ Failed to get workspaces: {response.status_code}", "ERROR")
            return False
            
        workspaces = response.json().get("workspaces", [])
        if workspaces:
            self.workspace_id = workspaces[0]["id"]
            self.log(f"✅ Using existing workspace: {self.workspace_id}")
        else:
            # Create workspace
            response = self.session.post(f"{BASE_URL}/workspaces", json={
                "title": "Document Button Persistence Test",
                "description": "Testing document button state persistence fix"
            })
            if response.status_code == 201:
                self.workspace_id = response.json()["id"]
                self.log(f"✅ Created new workspace: {self.workspace_id}")
            else:
                self.log(f"❌ Failed to create workspace: {response.status_code}", "ERROR")
                return False
                
        return True
        
    def upload_test_document(self):
        """Upload a test document"""
        self.log("=== STEP 3: UPLOAD DOCUMENT ===")
        
        # Create a test file
        test_content = "This is a test document for button state persistence testing.\nTesting the fix for document upload functionality."
        
        files = {
            'files': ('test-document-persistence.txt', test_content, 'text/plain')
        }
        
        response = self.session.post(
            f"{BASE_URL}/workspaces/{self.workspace_id}/documents/upload",
            files=files
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get("documents"):
                self.test_document_id = data["documents"][0]["id"]
                self.log(f"✅ Document uploaded successfully: {self.test_document_id}")
                return True
            else:
                self.log(f"❌ No documents in response: {data}", "ERROR")
                return False
        else:
            self.log(f"❌ Document upload failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def create_document_message(self):
        """Create a document message in the chat"""
        self.log("=== STEP 4: CREATE DOCUMENT MESSAGE ===")
        
        response = self.session.post(
            f"{BASE_URL}/workspaces/{self.workspace_id}/messages/document",
            json={"document_ids": [self.test_document_id]}
        )
        
        if response.status_code == 200:
            data = response.json()
            self.document_message_id = data.get('id')
            self.log(f"✅ Document message created: {self.document_message_id}")
            
            # Check initial state
            if data.get('documents'):
                doc = data['documents'][0]
                initial_node_id = doc.get('added_to_map_node_id')
                self.log(f"📄 Initial document state: added_to_map_node_id = {initial_node_id}")
            
            return True
        else:
            self.log(f"❌ Document message creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def create_document_node(self):
        """Create a node from the document (simulate Add to Map)"""
        self.log("=== STEP 5: CREATE DOCUMENT NODE ===")
        
        node_data = {
            "title": "Document: test-document-persistence",
            "description": f"Document: test-document-persistence.txt",
            "type": "human",
            "x": 300,
            "y": 300,
            "source_document_id": self.test_document_id,
            "source_document_name": "test-document-persistence.txt",
            "source_document_page": 1
        }
        
        response = self.session.post(
            f"{BASE_URL}/workspaces/{self.workspace_id}/nodes",
            json=node_data
        )
        
        if response.status_code == 200:
            data = response.json()
            self.test_node_id = data.get("id")
            self.log(f"✅ Document node created: {self.test_node_id}")
            return True
        else:
            self.log(f"❌ Document node creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def update_document_relationship(self):
        """Update the document-to-node relationship in the database"""
        self.log("=== STEP 6: UPDATE DOCUMENT RELATIONSHIP ===")
        
        response = self.session.put(
            f"{BASE_URL}/workspaces/{self.workspace_id}/messages/{self.document_message_id}/document/{self.test_document_id}/add-to-map?node_id={self.test_node_id}"
        )
        
        if response.status_code == 200:
            self.log(f"✅ Document-to-node relationship updated in database")
            return True
        else:
            self.log(f"❌ Failed to update document relationship: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def check_document_state(self, phase):
        """Check the current state of the document message"""
        self.log(f"=== STEP 7{phase}: CHECK DOCUMENT STATE ===")
        
        response = self.session.get(f"{BASE_URL}/workspaces/{self.workspace_id}/messages")
        if response.status_code != 200:
            self.log(f"❌ Failed to get messages: {response.status_code}", "ERROR")
            return None
            
        messages = response.json().get("messages", [])
        document_message = None
        
        for msg in messages:
            if msg.get("type") == "document" and msg.get("id") == self.document_message_id:
                document_message = msg
                break
                
        if not document_message:
            self.log(f"❌ Document message not found")
            return None
            
        self.log(f"📄 Document Message Found:")
        self.log(f"   - Message ID: {document_message.get('id')}")
        self.log(f"   - added_to_map: {document_message.get('added_to_map')}")
        
        if document_message.get("documents"):
            for doc in document_message["documents"]:
                if doc.get("id") == self.test_document_id:
                    self.log(f"   - Document ID: {doc.get('id')}")
                    self.log(f"   - added_to_map_node_id: {doc.get('added_to_map_node_id')}")
                    return doc.get('added_to_map_node_id')
                    
        return None
        
    def check_node_exists(self, phase):
        """Check if the document node still exists"""
        self.log(f"=== STEP 8{phase}: CHECK NODE EXISTS ===")
        
        response = self.session.get(f"{BASE_URL}/workspaces/{self.workspace_id}/nodes")
        if response.status_code != 200:
            self.log(f"❌ Failed to get nodes: {response.status_code}", "ERROR")
            return False
            
        nodes = response.json().get("nodes", [])
        document_node = None
        
        for node in nodes:
            if node.get("id") == self.test_node_id:
                document_node = node
                break
                
        if document_node:
            self.log(f"🗺️ Document Node Found:")
            self.log(f"   - Node ID: {document_node.get('id')}")
            self.log(f"   - Title: {document_node.get('title')}")
            self.log(f"   - source_document_id: {document_node.get('source_document_id')}")
            return True
        else:
            self.log(f"❌ Document node not found")
            return False
            
    def run_persistence_test(self):
        """Run the complete persistence test"""
        self.log("🔍 STARTING DOCUMENT BUTTON PERSISTENCE TEST")
        self.log("=" * 60)
        
        # Phase 1: Initial setup and node creation
        if not self.login():
            return False
            
        if not self.get_workspace():
            return False
            
        if not self.upload_test_document():
            return False
            
        if not self.create_document_message():
            return False
            
        if not self.create_document_node():
            return False
            
        if not self.update_document_relationship():
            return False
            
        # Check state before logout
        node_id_before = self.check_document_state("A (Before Logout)")
        node_exists_before = self.check_node_exists("A (Before Logout)")
        
        # Phase 2: Logout and login cycle
        self.log("\n" + "=" * 60)
        self.log("🔄 TESTING LOGIN/LOGOUT CYCLE")
        self.log("=" * 60)
        
        self.logout()
        time.sleep(1)  # Brief pause
        
        if not self.login():
            return False
            
        # Check state after login
        node_id_after = self.check_document_state("B (After Login)")
        node_exists_after = self.check_node_exists("B (After Login)")
        
        # Analysis
        self.log("\n" + "=" * 60)
        self.log("📊 PERSISTENCE TEST RESULTS")
        self.log("=" * 60)
        
        # Test Results
        persistence_working = (
            node_id_before == self.test_node_id and
            node_id_after == self.test_node_id and
            node_exists_before and
            node_exists_after
        )
        
        if persistence_working:
            self.log("✅ PERSISTENCE TEST PASSED!")
            self.log("   - Document-to-node relationship persisted correctly")
            self.log("   - Node exists before and after login")
            self.log("   - Database relationship maintained")
        else:
            self.log("❌ PERSISTENCE TEST FAILED!")
            self.log(f"   - Node ID before logout: {node_id_before}")
            self.log(f"   - Node ID after login: {node_id_after}")
            self.log(f"   - Node exists before: {node_exists_before}")
            self.log(f"   - Node exists after: {node_exists_after}")
            
        self.log("\n🔍 EXPECTED BEHAVIOR:")
        self.log("1. Document button should show 'Added to Map' after login")
        self.log("2. Document-to-node relationship should be restored from database")
        self.log("3. Button state should match actual node existence")
        
        return persistence_working

if __name__ == "__main__":
    test = DocumentButtonPersistenceTest()
    try:
        success = test.run_persistence_test()
        if success:
            print("\n✅ Document button persistence fix verification PASSED")
        else:
            print("\n❌ Document button persistence fix verification FAILED")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        sys.exit(1)