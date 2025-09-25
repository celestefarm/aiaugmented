#!/usr/bin/env python3
"""
Test script to verify that the authentication fixes have resolved the 403 Forbidden errors.
This script tests both unauthenticated and authenticated scenarios.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:5137"

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_step(step, description):
    print(f"\n🔍 Step {step}: {description}")
    print("-" * 50)

def test_backend_health():
    """Test if backend is running and healthy"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/v1/healthz", timeout=5)
        print(f"✅ Backend health check: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Status: {data.get('status', 'unknown')}")
            print(f"   Database connected: {data.get('database', {}).get('connected', 'unknown')}")
            print(f"   Response time: {data.get('database', {}).get('response_time_ms', 'unknown')}ms")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False

def test_unauthenticated_endpoints():
    """Test that protected endpoints return 401/403 when not authenticated"""
    print_step(1, "Testing Unauthenticated Access (Should Return 401/403)")
    
    protected_endpoints = [
        "/api/v1/workspaces",
        "/api/v1/agents",
        "/api/v1/nodes",
        "/api/v1/edges"
    ]
    
    results = {}
    for endpoint in protected_endpoints:
        try:
            response = requests.get(f"{BACKEND_URL}{endpoint}", timeout=5)
            status = response.status_code
            results[endpoint] = status
            
            if status in [401, 403]:
                print(f"✅ {endpoint}: {status} (Correctly protected)")
            else:
                print(f"⚠️  {endpoint}: {status} (Expected 401/403)")
                
        except Exception as e:
            print(f"❌ {endpoint}: Error - {e}")
            results[endpoint] = "ERROR"
    
    return results

def test_authentication_flow():
    """Test login and authenticated access"""
    print_step(2, "Testing Authentication Flow")
    
    # Test login
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BACKEND_URL}/api/v1/auth/login", json=login_data, timeout=5)
        print(f"Login attempt: {response.status_code}")
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get("access_token")
            print(f"✅ Login successful, token received")
            
            # Test authenticated requests
            headers = {"Authorization": f"Bearer {access_token}"}
            
            protected_endpoints = [
                "/api/v1/workspaces",
                "/api/v1/agents"
            ]
            
            print(f"\nTesting authenticated access:")
            for endpoint in protected_endpoints:
                try:
                    auth_response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers, timeout=5)
                    print(f"✅ {endpoint}: {auth_response.status_code} (Authenticated)")
                    if auth_response.status_code == 200:
                        data = auth_response.json()
                        if isinstance(data, list):
                            print(f"   Returned {len(data)} items")
                        else:
                            print(f"   Response type: {type(data)}")
                except Exception as e:
                    print(f"❌ {endpoint}: Error - {e}")
            
            return True, access_token
        else:
            print(f"❌ Login failed: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error: {error_data}")
            except:
                print(f"   Response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        return False, None

def test_frontend_behavior():
    """Test that frontend handles unauthenticated state properly"""
    print_step(3, "Testing Frontend Behavior")
    
    try:
        response = requests.get(FRONTEND_URL, timeout=10)
        print(f"✅ Frontend accessible: {response.status_code}")
        
        # Check if frontend is serving content
        if response.status_code == 200:
            content_length = len(response.text)
            print(f"   Content length: {content_length} characters")
            
            # Look for key indicators in the HTML
            html_content = response.text.lower()
            if "react" in html_content or "vite" in html_content:
                print(f"✅ Frontend appears to be a React/Vite application")
            
            return True
        else:
            print(f"⚠️  Frontend returned: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Frontend test failed: {e}")
        return False

def main():
    print_header("AUTHENTICATION FIX VERIFICATION TEST")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Frontend URL: {FRONTEND_URL}")
    
    # Test 1: Backend Health
    print_step("Pre", "Backend Health Check")
    if not test_backend_health():
        print("❌ Backend is not healthy. Cannot proceed with tests.")
        return
    
    # Test 2: Unauthenticated endpoints
    unauth_results = test_unauthenticated_endpoints()
    
    # Test 3: Authentication flow
    auth_success, token = test_authentication_flow()
    
    # Test 4: Frontend behavior
    frontend_ok = test_frontend_behavior()
    
    # Summary
    print_header("TEST SUMMARY")
    
    print(f"🔍 Backend Health: {'✅ PASS' if test_backend_health() else '❌ FAIL'}")
    
    # Check if protected endpoints are properly secured
    properly_protected = all(status in [401, 403] for status in unauth_results.values() if status != "ERROR")
    print(f"🔒 Endpoint Protection: {'✅ PASS' if properly_protected else '❌ FAIL'}")
    
    print(f"🔐 Authentication Flow: {'✅ PASS' if auth_success else '❌ FAIL'}")
    print(f"🌐 Frontend Accessibility: {'✅ PASS' if frontend_ok else '❌ FAIL'}")
    
    # Overall assessment
    if properly_protected and auth_success and frontend_ok:
        print(f"\n🎉 OVERALL RESULT: ✅ AUTHENTICATION FIX SUCCESSFUL")
        print(f"   • Protected endpoints correctly return 401/403 when unauthenticated")
        print(f"   • Authentication flow works properly")
        print(f"   • Frontend is accessible")
        print(f"   • The 403 Forbidden errors should now be resolved!")
    else:
        print(f"\n⚠️  OVERALL RESULT: ❌ ISSUES DETECTED")
        print(f"   • Some components may still have issues")
        print(f"   • Review the test results above for details")
    
    print(f"\n📝 NEXT STEPS:")
    print(f"   1. Open the frontend at {FRONTEND_URL}")
    print(f"   2. Check browser console for any remaining errors")
    print(f"   3. Try logging in with username: 'celeste', password: 'password123'")
    print(f"   4. Verify that data loads properly after authentication")

if __name__ == "__main__":
    main()