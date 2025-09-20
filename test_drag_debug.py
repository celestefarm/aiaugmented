#!/usr/bin/env python3
"""
Test script to create a test user and verify drag functionality
This bypasses authentication issues to focus on drag debugging
"""

import requests
import json
import time
import bcrypt
from pymongo import MongoClient

def create_test_user():
    """Create a test user directly in the database"""
    try:
        # Connect to MongoDB
        client = MongoClient('mongodb://localhost:27017/')
        db = client['strategic_copilot']
        users_collection = db['users']
        
        # Create test user with bcrypt hash
        password = "dragtest123"
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        
        test_user = {
            "email": "dragtest@example.com",
            "name": "Drag Test User",
            "password_hash": password_hash,
            "is_active": True
        }
        
        # Remove existing user if exists
        users_collection.delete_one({"email": "dragtest@example.com"})
        
        # Insert new user
        result = users_collection.insert_one(test_user)
        print(f"✅ Created test user with ID: {result.inserted_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
        return False

def test_login():
    """Test login with the created user"""
    try:
        login_data = {
            "email": "dragtest@example.com",
            "password": "dragtest123"
        }
        
        response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access_token')
            print(f"✅ Login successful, token: {token[:20]}...")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        return None

def create_test_workspace(token):
    """Create a test workspace"""
    try:
        workspace_data = {
            "name": "Drag Test Workspace",
            "description": "Workspace for testing drag functionality"
        }
        
        response = requests.post(
            "http://localhost:8000/api/v1/workspaces",
            json=workspace_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}"
            }
        )
        
        if response.status_code == 201:
            workspace = response.json()
            print(f"✅ Created workspace: {workspace['id']}")
            return workspace['id']
        else:
            print(f"❌ Workspace creation failed: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Workspace creation request failed: {e}")
        return None

def create_test_nodes(token, workspace_id):
    """Create test nodes for drag testing"""
    try:
        nodes = [
            {
                "title": "Test Node 1",
                "description": "First test node for drag testing",
                "type": "human",
                "x": 100,
                "y": 100
            },
            {
                "title": "Test Node 2", 
                "description": "Second test node for drag testing",
                "type": "ai",
                "x": 300,
                "y": 200
            }
        ]
        
        created_nodes = []
        for node_data in nodes:
            response = requests.post(
                f"http://localhost:8000/api/v1/workspaces/{workspace_id}/nodes",
                json=node_data,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                }
            )
            
            if response.status_code == 201:
                node = response.json()
                created_nodes.append(node)
                print(f"✅ Created node: {node['id']} - {node['title']}")
            else:
                print(f"❌ Node creation failed: {response.status_code} - {response.text}")
        
        return created_nodes
        
    except Exception as e:
        print(f"❌ Node creation request failed: {e}")
        return []

def main():
    print("🔧 Setting up drag test environment...")
    
    # Step 1: Create test user
    if not create_test_user():
        return
    
    # Step 2: Login
    token = test_login()
    if not token:
        return
    
    # Step 3: Create workspace
    workspace_id = create_test_workspace(token)
    if not workspace_id:
        return
    
    # Step 4: Create test nodes
    nodes = create_test_nodes(token, workspace_id)
    if not nodes:
        return
    
    print("\n🎯 Test environment ready!")
    print(f"📧 Email: dragtest@example.com")
    print(f"🔑 Password: dragtest123")
    print(f"🏢 Workspace ID: {workspace_id}")
    print(f"📦 Created {len(nodes)} test nodes")
    print("\n🌐 You can now login at http://localhost:5137 and test drag functionality")
    print("🔍 Check browser console for detailed drag debugging logs")

if __name__ == "__main__":
    main()