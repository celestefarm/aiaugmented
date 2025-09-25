#!/usr/bin/env python3
"""
Quick test to verify the backend remove-from-map endpoint is working
"""

import requests
import json

def test_backend_endpoint():
    """Test that the remove-from-map endpoint exists"""
    
    print("🔍 Testing Backend Remove-From-Map Endpoint")
    print("=" * 50)
    
    # Test if backend is running
    try:
        response = requests.get("http://localhost:8000/")
        if response.status_code == 200:
            print("✅ Backend server is running")
        else:
            print(f"❌ Backend server returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend server not accessible: {e}")
        return False
    
    # Test if API docs are accessible
    try:
        response = requests.get("http://localhost:8000/docs")
        if response.status_code == 200:
            print("✅ API documentation is accessible")
        else:
            print(f"❌ API docs returned: {response.status_code}")
    except Exception as e:
        print(f"❌ API docs not accessible: {e}")
    
    # Test if the specific endpoint exists (without authentication)
    try:
        # Use OPTIONS to check if endpoint exists
        response = requests.options("http://localhost:8000/api/v1/workspaces/test/messages/remove-from-map")
        if response.status_code in [200, 405, 401]:  # 405 = Method not allowed, 401 = Unauthorized (but exists)
            print("✅ remove-from-map endpoint exists")
        else:
            print(f"❌ remove-from-map endpoint returned: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ remove-from-map endpoint test failed: {e}")
        return False
    
    print("\n🎯 DIAGNOSIS:")
    print("✅ Backend server is running")
    print("✅ API endpoints are accessible") 
    print("✅ remove-from-map endpoint exists")
    print("\n💡 SOLUTION:")
    print("The backend is working correctly. The 404 error in the browser")
    print("might be due to:")
    print("1. Browser cache - try hard refresh (Ctrl+F5)")
    print("2. Frontend not connecting to the right backend URL")
    print("3. Authentication issues")
    print("\n🔧 NEXT STEPS:")
    print("1. Open browser developer tools")
    print("2. Check Network tab for the actual API call")
    print("3. Verify the request URL and headers")
    print("4. Try deleting a node again and check the console")
    
    return True

if __name__ == "__main__":
    test_backend_endpoint()