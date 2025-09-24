#!/usr/bin/env python3
"""
Test authentication with current frontend token to debug the issue
"""

import requests
import json

# API base URL
API_BASE = "http://localhost:8000/api/v1"

def test_auth_debug():
    """Test authentication with a potentially old token"""
    
    print("=== AUTHENTICATION DEBUG TEST ===")
    
    # First, let's try to login to get a fresh token
    print("\n=== STEP 1: GET FRESH TOKEN ===")
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/login", json=login_data)
        if response.status_code == 200:
            auth_data = response.json()
            fresh_token = auth_data["access_token"]
            user = auth_data["user"]
            print(f"✅ Fresh login successful")
            print(f"   User: {user['name']} ({user['email']})")
            print(f"   User ID: {user.get('id') or user.get('_id')}")
            print(f"   Fresh token: {fresh_token[:20]}...")
        else:
            print(f"❌ Fresh login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Fresh login error: {e}")
        return
    
    # Test with fresh token
    print("\n=== STEP 2: TEST WITH FRESH TOKEN ===")
    headers = {
        "Authorization": f"Bearer {fresh_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE}/workspaces", headers=headers)
        print(f"Fresh token test - Status: {response.status_code}")
        if response.status_code == 200:
            workspaces_data = response.json()
            print(f"✅ Fresh token works - Found {len(workspaces_data['workspaces'])} workspaces")
        else:
            print(f"❌ Fresh token failed: {response.text}")
    except Exception as e:
        print(f"❌ Fresh token test error: {e}")
    
    # Now let's simulate an old token scenario
    print("\n=== STEP 3: SIMULATE OLD TOKEN SCENARIO ===")
    
    # Create a token with an old user ID (from previous backend restart)
    old_user_id = "68d3bf1a78995be58483be8e"  # From previous backend restart
    print(f"Simulating old token with user ID: {old_user_id}")
    
    # We can't easily create a fake JWT token, so let's just test with a malformed token
    old_headers = {
        "Authorization": f"Bearer invalid_old_token_simulation",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{API_BASE}/workspaces", headers=old_headers)
        print(f"Old token simulation - Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"❌ Old token simulation error: {e}")
    
    print("\n=== TEST COMPLETE ===")
    print("Check the backend logs for authentication debug information")

if __name__ == "__main__":
    test_auth_debug()