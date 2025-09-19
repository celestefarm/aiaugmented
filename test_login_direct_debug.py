#!/usr/bin/env python3
"""
Direct test of login API to debug authentication issue
"""
import requests
import json

def test_login():
    """Test login with the exact credentials that are failing"""
    
    # Test credentials
    email = "celeste.fcp@gmail.com"
    password = "celeste060291"
    
    # API endpoint
    url = "http://localhost:8000/api/v1/auth/login"
    
    # Prepare the request data (matching frontend format)
    login_data = {
        "email": email,
        "password": password
    }
    
    print("=== DIRECT LOGIN TEST ===")
    print(f"Testing login for: {email}")
    print(f"Password length: {len(password)}")
    print(f"API URL: {url}")
    print(f"Request data: {login_data}")
    
    try:
        # Send POST request with JSON data (matching frontend)
        headers = {
            'Content-Type': 'application/json'
        }
        
        response = requests.post(
            url, 
            json=login_data,  # This sends as JSON, matching frontend
            headers=headers,
            timeout=10
        )
        
        print(f"\n=== RESPONSE ===")
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            response_data = response.json()
            print("✅ LOGIN SUCCESS!")
            print(f"Token received: {response_data.get('access_token', 'N/A')[:20]}...")
            print(f"User data: {response_data.get('user', {})}")
        else:
            print("❌ LOGIN FAILED!")
            try:
                error_data = response.json()
                print(f"Error details: {error_data}")
            except:
                print(f"Raw response: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST FAILED: {e}")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    test_login()