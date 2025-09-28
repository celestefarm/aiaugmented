#!/usr/bin/env python3
"""
Document Button State Diagnosis Script
Tests the document upload button state persistence across login/logout cycles
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

class DocumentButtonStateDiagnostic:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.workspace_id = None
        self.test_document_id = None
        self.test_node_id = None
        
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
            self.log(f"✅ Login successful, token: {self.auth_token[:20]}...")
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
                "title": "Document Button Test Workspace",
                "description": "Testing document button state persistence"
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
        test_content = "This is a test document for button state diagnosis.\nTesting document upload functionality."
        
        files = {
            'files': ('test-document-diagnosis.txt', test_content, 'text/plain')
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
                self.log(f"Document details: {json.dumps(data['documents'][0], indent=2)}")
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
            self.log(f"✅ Document message created: {data.get('id')}")
            self.log(f"Message details: {json.dumps(data, indent=2)}")
            return True
        else:
            self.log(f"❌ Document message creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def create_document_node(self):
        """Create a node from the document (simulate Add to Map)"""
        self.log("=== STEP 5: CREATE DOCUMENT NODE ===")
        
        node_data = {
            "title": "Document: test-document-diagnosis",
            "description": f"Document: test-document-diagnosis.txt",
            "type": "human",
            "x": 200,
            "y": 200,
            "source_document_id": self.test_document_id,
            "source_document_name": "test-document-diagnosis.txt",
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
            self.log(f"Node details: {json.dumps(data, indent=2)}")
            return True
        else:
            self.log(f"❌ Document node creation failed: {response.status_code} - {response.text}", "ERROR")
            return False
            
    def check_messages_state(self, phase):
        """Check the current state of messages"""
        self.log(f"=== STEP 6{phase}: CHECK MESSAGES STATE ===")
        
        response = self.session.get(f"{BASE_URL}/workspaces/{self.workspace_id}/messages")
        if response.status_code != 200:
            self.log(f"❌ Failed to get messages: {response.status_code}", "ERROR")
            return False
            
        messages = response.json().get("messages", [])
        self.log(f"📊 Found {len(messages)} messages")
        
        for msg in messages:
            if msg.get("type") == "document":
                self.log(f"📄 Document Message: {msg.get('id')}")
                self.log(f"   - added_to_map: {msg.get('added_to_map')}")
                if msg.get("documents"):
                    for doc in msg["documents"]:
                        self.log(f"   - Document ID: {doc.get('id')}")
                        self.log(f"   - added_to_map_node_id: {doc.get('added_to_map_node_id')}")
                        
        return True
        
    def check_nodes_state(self, phase):
        """Check the current state of nodes"""
        self.log(f"=== STEP 7{phase}: CHECK NODES STATE ===")
        
        response = self.session.get(f"{BASE_URL}/workspaces/{self.workspace_id}/nodes")
        if response.status_code != 200:
            self.log(f"❌ Failed to get nodes: {response.status_code}", "ERROR")
            return False
            
        nodes = response.json().get("nodes", [])
        self.log(f"🗺️ Found {len(nodes)} nodes")
        
        document_nodes = [n for n in nodes if n.get("source_document_id") == self.test_document_id]
        self.log(f"📄 Found {len(document_nodes)} nodes for our test document")
        
        for node in document_nodes:
            self.log(f"   - Node ID: {node.get('id')}")
            self.log(f"   - Title: {node.get('title')}")
            self.log(f"   - source_document_id: {node.get('source_document_id')}")
            self.log(f"   - source_document_name: {node.get('source_document_name')}")
            
        return len(document_nodes) > 0
        
    def run_diagnosis(self):
        """Run the complete diagnosis"""
        self.log("🔍 STARTING DOCUMENT BUTTON STATE DIAGNOSIS")
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
            
        # Check state before logout
        self.check_messages_state("A (Before Logout)")
        node_exists_before = self.check_nodes_state("A (Before Logout)")
        
        # Phase 2: Logout and login cycle
        self.log("\n" + "=" * 60)
        self.log("🔄 TESTING LOGIN/LOGOUT CYCLE")
        self.log("=" * 60)
        
        self.logout()
        time.sleep(1)  # Brief pause
        
        if not self.login():
            return False
            
        # Check state after login
        self.check_messages_state("B (After Login)")
        node_exists_after = self.check_nodes_state("B (After Login)")
        
        # Analysis
        self.log("\n" + "=" * 60)
        self.log("📊 DIAGNOSIS RESULTS")
        self.log("=" * 60)
        
        if node_exists_before and node_exists_after:
            self.log("✅ Node persistence: WORKING - Node exists before and after login")
        elif node_exists_before and not node_exists_after:
            self.log("❌ Node persistence: BROKEN - Node disappeared after login")
        else:
            self.log("⚠️ Node persistence: UNCLEAR - Node creation may have failed")
            
        self.log("\n🔍 KEY FINDINGS:")
        self.log("1. Check if document messages have proper added_to_map status")
        self.log("2. Check if documents have added_to_map_node_id set")
        self.log("3. Check if nodes have proper source_document_id linkage")
        self.log("4. Verify if the sync logic can match nodes back to documents")
        
        return True

if __name__ == "__main__":
    diagnostic = DocumentButtonStateDiagnostic()
    try:
        success = diagnostic.run_diagnosis()
        if success:
            print("\n✅ Diagnosis completed successfully")
        else:
            print("\n❌ Diagnosis failed")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n⚠️ Diagnosis interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Diagnosis failed with error: {e}")
        sys.exit(1)