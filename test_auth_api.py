#!/usr/bin/env python3
"""
Test script to verify authentication API is working
"""

import requests
import json
import time

# Test credentials
TEST_EMAIL = "celeste.fcp@gmail.co"
TEST_PASSWORD = "celeste060291"
API_BASE = "http://localhost:8000/api/v1"

def test_health():
    """Test if the server is running"""
    try:
        response = requests.get(f"{API_BASE}/health", timeout=5)
        print(f"✅ Health check: {response.status_code} - {response.json()}")
        return True
    except requests.exceptions.ConnectionError:
        print("❌ Server not running - connection refused")
        return False
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_login():
    """Test login with Celeste's credentials"""
    try:
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        print(f"\n=== TESTING LOGIN ===")
        print(f"Email: {TEST_EMAIL}")
        print(f"Password length: {len(TEST_PASSWORD)}")
        
        response = requests.post(
            f"{API_BASE}/auth/login",
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ LOGIN SUCCESSFUL!")
            print(f"Token received: {data.get('access_token', 'N/A')[:20]}...")
            print(f"User: {data.get('user', {}).get('name', 'N/A')} ({data.get('user', {}).get('email', 'N/A')})")
            return data.get('access_token')
        else:
            print(f"❌ LOGIN FAILED: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Error text: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Login request failed: {e}")
        return None

def test_workspaces(token):
    """Test workspace loading with token"""
    if not token:
        print("❌ No token available for workspace test")
        return
    
    try:
        print(f"\n=== TESTING WORKSPACE ACCESS ===")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(
            f"{API_BASE}/workspaces",
            headers=headers,
            timeout=10
        )
        
        print(f"Workspace response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ WORKSPACE ACCESS SUCCESSFUL!")
            print(f"Workspaces found: {data.get('total', 0)}")
            
            workspaces = data.get('workspaces', [])
            for i, ws in enumerate(workspaces[:3]):  # Show first 3
                print(f"  {i+1}. {ws.get('title', 'Untitled')} (ID: {ws.get('id', 'N/A')})")
        else:
            print(f"❌ WORKSPACE ACCESS FAILED: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Error text: {response.text}")
                
    except Exception as e:
        print(f"❌ Workspace request failed: {e}")

def main():
    print("=== AUTHENTICATION API TEST ===")
    
    # Wait for server to start
    print("Waiting for server to start...")
    for i in range(10):  # Wait up to 10 seconds
        if test_health():
            break
        time.sleep(1)
        print(f"Attempt {i+1}/10...")
    else:
        print("❌ Server failed to start within 10 seconds")
        return
    
    # Test login
    token = test_login()
    
    # Test workspace access
    test_workspaces(token)
    
    print("\n=== TEST COMPLETE ===")

if __name__ == "__main__":
    main()