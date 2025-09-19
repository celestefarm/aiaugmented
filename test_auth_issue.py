#!/usr/bin/env python3
"""
Test script to verify the authentication issue with generate-brief endpoint
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_auth_flow():
    """Test the complete authentication flow"""
    print("=== TESTING AUTHENTICATION FLOW ===")
    
    # Step 1: Try to access protected endpoint without auth
    test_workspace_id = "507f1f77bcf86cd799439011"
    url = f"{BASE_URL}/workspaces/{test_workspace_id}/generate-brief"
    
    print(f"1. Testing endpoint without authentication: {url}")
    response = requests.post(url)
    print(f"   Status: {response.status_code}")
    print(f"   Response: {response.text}")
    
    if response.status_code == 404:
        print("   ❌ ENDPOINT NOT FOUND - This is the routing issue!")
        return False
    elif response.status_code == 403 or response.status_code == 401:
        print("   ✅ ENDPOINT EXISTS - Authentication required (expected)")
    else:
        print(f"   ⚠️  UNEXPECTED STATUS: {response.status_code}")
    
    # Step 2: Try to login (this will likely fail without valid credentials)
    print("\n2. Testing login endpoint...")
    login_url = f"{BASE_URL}/auth/login"
    login_data = {
        "email": "test@example.com",
        "password": "testpassword"
    }
    
    login_response = requests.post(login_url, json=login_data)
    print(f"   Login Status: {login_response.status_code}")
    print(f"   Login Response: {login_response.text}")
    
    if login_response.status_code == 200:
        print("   ✅ LOGIN SUCCESSFUL")
        token_data = login_response.json()
        token = token_data.get('access_token')
        
        # Step 3: Try the protected endpoint with auth
        print("\n3. Testing endpoint with authentication...")
        headers = {"Authorization": f"Bearer {token}"}
        auth_response = requests.post(url, headers=headers)
        print(f"   Authenticated Status: {auth_response.status_code}")
        print(f"   Authenticated Response: {auth_response.text}")
        
        if auth_response.status_code == 200:
            print("   ✅ ENDPOINT WORKS WITH AUTHENTICATION")
            return True
        else:
            print(f"   ❌ ENDPOINT STILL FAILING: {auth_response.status_code}")
            return False
    else:
        print("   ❌ LOGIN FAILED - Cannot test authenticated endpoint")
        print("   This is expected if no test user exists")
        return None

if __name__ == "__main__":
    test_auth_flow()