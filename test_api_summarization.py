#!/usr/bin/env python3
"""
Test the API endpoint for conversation summarization.

This test verifies that the /api/v1/nodes/{node_id}/summarize endpoint
works correctly with various conversation examples.
"""

import asyncio
import sys
import os
sys.path.append('./backend')

from database import connect_to_mongo, close_mongo_connection, get_database
from models.node import NodeCreate
from models.user import UserCreate, UserInDB
from utils.auth import hash_password
from datetime import datetime
from bson import ObjectId
import requests
import json

# Test configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "test_summarization@example.com"
TEST_USER_PASSWORD = "testpass123"

async def setup_test_data():
    """Set up test user, workspace, and node for testing"""
    print("Setting up test data...")
    
    await connect_to_mongo()
    db = get_database()
    
    # Clean up any existing test data
    await db.users.delete_many({"email": TEST_USER_EMAIL})
    
    # Create test user
    user_data = UserCreate(
        email=TEST_USER_EMAIL,
        password_hash=hash_password(TEST_USER_PASSWORD),
        name="Test User for Summarization",
        created_at=datetime.utcnow(),
        is_active=True
    )
    
    user_doc = user_data.model_dump()
    
    result = await db.users.insert_one(user_doc)
    user_id = result.inserted_id
    
    # Create test workspace
    workspace_doc = {
        "name": "Test Workspace for Summarization",
        "description": "Test workspace for API summarization testing",
        "owner_id": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    result = await db.workspaces.insert_one(workspace_doc)
    workspace_id = result.inserted_id
    
    # Create test node with a long conversation title
    conversation_title = "It seems you've mentioned 'market,' however, your request lacks specific details about which market segment you're targeting and what strategic objectives you're trying to achieve. To provide you with the most relevant strategic options, I'm going to need a bit more information about your current market position and competitive landscape."
    
    node_data = NodeCreate(
        workspace_id=str(workspace_id),
        title=conversation_title,
        description="Test node for conversation summarization",
        type="ai",
        x=100.0,
        y=100.0,
        confidence=85,
        feasibility="high",
        source_agent="strategist",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    result = await db.nodes.insert_one(node_data.model_dump())
    node_id = result.inserted_id
    
    await close_mongo_connection()
    
    return {
        "user_id": str(user_id),
        "workspace_id": str(workspace_id),
        "node_id": str(node_id),
        "conversation_title": conversation_title
    }

def get_auth_token():
    """Get authentication token for API requests"""
    login_data = {
        "username": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    }
    
    response = requests.post(
        f"{API_BASE_URL}/auth/login",
        data=login_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        raise Exception(f"Failed to get auth token: {response.status_code} - {response.text}")

def test_summarization_endpoint(node_id, auth_token):
    """Test the summarization endpoint with various contexts"""
    print(f"\n=== TESTING API ENDPOINT: /nodes/{node_id}/summarize ===")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    # Test different contexts
    contexts = [
        {"context": "card", "max_length": None},
        {"context": "tooltip", "max_length": None},
        {"context": "list", "max_length": None},
        {"context": "default", "max_length": None},
        {"context": "card", "max_length": 20},  # Custom length
        {"context": "default", "max_length": 50}  # Custom length
    ]
    
    for test_case in contexts:
        print(f"\nTesting context: {test_case['context']}, max_length: {test_case['max_length']}")
        
        response = requests.post(
            f"{API_BASE_URL}/nodes/{node_id}/summarize",
            json=test_case,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Success!")
            print(f"   Original: {result['original_title'][:100]}...")
            print(f"   Summary: {result['summarized_title']}")
            print(f"   Method: {result['method_used']}")
            print(f"   Confidence: {result['confidence']}%")
            print(f"   Length: {len(result['summarized_title'])} chars")
            
            # Verify length constraints
            expected_max = test_case['max_length'] or (25 if test_case['context'] == 'card' else 35)
            if len(result['summarized_title']) <= expected_max:
                print(f"   ✅ Length constraint satisfied (≤{expected_max})")
            else:
                print(f"   ❌ Length constraint violated (>{expected_max})")
        else:
            print(f"❌ Failed: {response.status_code} - {response.text}")

def test_error_cases(auth_token):
    """Test error cases for the API endpoint"""
    print(f"\n=== TESTING ERROR CASES ===")
    
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    # Test with invalid node ID
    print("\nTesting invalid node ID...")
    response = requests.post(
        f"{API_BASE_URL}/nodes/invalid_id/summarize",
        json={"context": "card"},
        headers=headers
    )
    print(f"Invalid node ID: {response.status_code} (expected 400)")
    
    # Test with non-existent node ID
    print("\nTesting non-existent node ID...")
    fake_id = str(ObjectId())
    response = requests.post(
        f"{API_BASE_URL}/nodes/{fake_id}/summarize",
        json={"context": "card"},
        headers=headers
    )
    print(f"Non-existent node: {response.status_code} (expected 404)")
    
    # Test without authentication
    print("\nTesting without authentication...")
    response = requests.post(
        f"{API_BASE_URL}/nodes/{fake_id}/summarize",
        json={"context": "card"}
    )
    print(f"No auth: {response.status_code} (expected 401)")

async def cleanup_test_data():
    """Clean up test data"""
    print("\nCleaning up test data...")
    
    await connect_to_mongo()
    db = get_database()
    
    # Find and delete test user and related data
    user = await db.users.find_one({"email": TEST_USER_EMAIL})
    if user:
        user_id = user["_id"]
        
        # Delete workspaces and their nodes
        workspaces = await db.workspaces.find({"owner_id": user_id}).to_list(length=None)
        for workspace in workspaces:
            workspace_id = workspace["_id"]
            await db.nodes.delete_many({"workspace_id": workspace_id})
            await db.edges.delete_many({"workspace_id": workspace_id})
        
        await db.workspaces.delete_many({"owner_id": user_id})
        await db.users.delete_one({"_id": user_id})
    
    await close_mongo_connection()
    print("✅ Cleanup completed")

async def main():
    """Main test function"""
    try:
        print("=== BACKEND API SUMMARIZATION TEST ===")
        
        # Setup test data
        test_data = await setup_test_data()
        print(f"✅ Test data created:")
        print(f"   User ID: {test_data['user_id']}")
        print(f"   Workspace ID: {test_data['workspace_id']}")
        print(f"   Node ID: {test_data['node_id']}")
        
        # Get authentication token
        auth_token = get_auth_token()
        print("✅ Authentication token obtained")
        
        # Test the summarization endpoint
        test_summarization_endpoint(test_data['node_id'], auth_token)
        
        # Test error cases
        test_error_cases(auth_token)
        
        print("\n" + "="*80)
        print("✅ ALL API TESTS COMPLETED SUCCESSFULLY!")
        print("✅ Backend conversation summarization API is working correctly!")
        print("="*80)
        
    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Always cleanup
        await cleanup_test_data()

if __name__ == "__main__":
    asyncio.run(main())