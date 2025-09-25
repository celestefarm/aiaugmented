#!/usr/bin/env python3
"""
API Endpoint Diagnostic Test
Tests the backend API endpoints to identify 404 error sources
"""

import requests
import json
import sys

API_BASE_URL = "http://localhost:8000/api/v1"

def test_endpoint(endpoint, method="GET", headers=None, data=None):
    """Test a single API endpoint"""
    url = f"{API_BASE_URL}{endpoint}"
    
    print(f"\n🔍 Testing {method} {url}")
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=5)
        else:
            print(f"❌ Unsupported method: {method}")
            return False
            
        print(f"📡 Response: {response.status_code} {response.reason}")
        
        if response.status_code == 404:
            print(f"❌ 404 NOT FOUND - Endpoint does not exist")
            return False
        elif response.status_code == 401:
            print(f"🔐 401 UNAUTHORIZED - Authentication required (endpoint exists)")
            return True
        elif response.status_code == 200:
            print(f"✅ 200 OK - Endpoint working")
            return True
        else:
            print(f"⚠️  {response.status_code} - Unexpected status")
            try:
                print(f"Response body: {response.text[:200]}...")
            except:
                pass
            return True
            
    except requests.exceptions.ConnectionError:
        print(f"❌ CONNECTION ERROR - Server not reachable")
        return False
    except requests.exceptions.Timeout:
        print(f"❌ TIMEOUT - Server not responding")
        return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def main():
    print("🚀 API Endpoint Diagnostic Test")
    print(f"Testing API at: {API_BASE_URL}")
    
    # Test basic endpoints
    endpoints_to_test = [
        "/health",
        "/auth/me",
        "/workspaces",
        "/agents",
        "/workspaces/test123/nodes",
        "/workspaces/test123/edges",
    ]
    
    results = {}
    
    for endpoint in endpoints_to_test:
        results[endpoint] = test_endpoint(endpoint)
    
    print("\n" + "="*50)
    print("📊 DIAGNOSTIC SUMMARY")
    print("="*50)
    
    working_endpoints = [ep for ep, working in results.items() if working]
    broken_endpoints = [ep for ep, working in results.items() if not working]
    
    if working_endpoints:
        print(f"✅ Working endpoints ({len(working_endpoints)}):")
        for ep in working_endpoints:
            print(f"   - {ep}")
    
    if broken_endpoints:
        print(f"❌ Broken endpoints ({len(broken_endpoints)}):")
        for ep in broken_endpoints:
            print(f"   - {ep}")
    
    if not broken_endpoints:
        print("🎉 All endpoints are reachable! The issue is likely authentication-related.")
    elif len(broken_endpoints) == len(endpoints_to_test):
        print("🚨 ALL endpoints are broken! The backend server may not be running properly.")
    else:
        print("⚠️  Some endpoints are broken. This suggests routing or configuration issues.")

if __name__ == "__main__":
    main()