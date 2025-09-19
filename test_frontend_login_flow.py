#!/usr/bin/env python3
import requests
import json

def test_frontend_login_flow():
    """
    Test the login flow exactly as the frontend would do it
    """
    # This simulates what the frontend API client does
    base_url = "http://localhost:8000/api/v1"
    url = f"{base_url}/auth/login"
    
    headers = {
        "Content-Type": "application/json"
    }
    
    # Exact same data format as frontend
    data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    print("=== FRONTEND LOGIN FLOW TEST ===")
    print(f"Base URL: {base_url}")
    print(f"Full URL: {url}")
    print(f"Headers: {headers}")
    print(f"Data: {data}")
    print()
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ Login successful!")
            print(f"Access Token: {response_data.get('access_token', 'N/A')[:50]}...")
            print(f"Token Type: {response_data.get('token_type', 'N/A')}")
            print(f"User Data: {response_data.get('user', 'N/A')}")
            
            # Check if user has both _id and id
            user = response_data.get('user', {})
            print(f"User _id: {user.get('_id', 'NOT PRESENT')}")
            print(f"User id: {user.get('id', 'NOT PRESENT')}")
            
            return True
        else:
            print("❌ Login failed!")
            print(f"Response Text: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_frontend_login_flow()
    if success:
        print("\n🎉 Frontend login flow test PASSED!")
    else:
        print("\n💥 Frontend login flow test FAILED!")