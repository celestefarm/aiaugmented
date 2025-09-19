#!/usr/bin/env python3
"""
Test script to debug the generate-brief endpoint issue
"""
import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_WORKSPACE_ID = "507f1f77bcf86cd799439011"  # Example ObjectId

def test_endpoint():
    """Test the generate-brief endpoint"""
    print("=== TESTING GENERATE-BRIEF ENDPOINT ===")
    
    # Test 1: Check if endpoint exists (without auth)
    url = f"{BASE_URL}/workspaces/{TEST_WORKSPACE_ID}/generate-brief"
    print(f"Testing URL: {url}")
    
    try:
        response = requests.post(url)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 404:
            print("❌ ENDPOINT NOT FOUND - This is the issue!")
            print("Response:", response.text)
        elif response.status_code == 401:
            print("✅ ENDPOINT EXISTS - Authentication required (expected)")
            print("Response:", response.text)
        else:
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ REQUEST FAILED: {e}")
    
    # Test 2: List all available routes
    print("\n=== CHECKING AVAILABLE ROUTES ===")
    try:
        docs_response = requests.get(f"http://localhost:8000/openapi.json")
        if docs_response.status_code == 200:
            openapi_spec = docs_response.json()
            paths = openapi_spec.get("paths", {})
            
            print("Available routes:")
            for path in sorted(paths.keys()):
                methods = list(paths[path].keys())
                print(f"  {path} - {methods}")
                
            # Check if our route exists
            expected_route = f"/api/v1/workspaces/{{workspace_id}}/generate-brief"
            route_found = any("generate-brief" in path for path in paths.keys())
            
            if route_found:
                print(f"✅ Generate-brief route found in OpenAPI spec")
            else:
                print(f"❌ Generate-brief route NOT found in OpenAPI spec")
                
        else:
            print(f"Failed to get OpenAPI spec: {docs_response.status_code}")
            
    except Exception as e:
        print(f"❌ FAILED TO CHECK ROUTES: {e}")

if __name__ == "__main__":
    test_endpoint()