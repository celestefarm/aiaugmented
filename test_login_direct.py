#!/usr/bin/env python3
"""
Direct test of the login API to debug authentication issues.
"""

import requests
import json

def test_login():
    """Test login with the provided credentials"""
    
    # Test credentials
    email = "celeste.fcp@gmail.com"
    password = "celeste060291"
    
    # API endpoint
    url = "http://localhost:8000/api/v1/auth/login"
    
    # Request payload
    payload = {
        "email": email,
        "password": password
    }
    
    # Headers
    headers = {
        "Content-Type": "application/json"
    }
    
    print("=== LOGIN TEST ===")
    print(f"URL: {url}")
    print(f"Email: {email}")
    print(f"Password: {password}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    print(f"Headers: {json.dumps(headers, indent=2)}")
    print()
    
    try:
        print("Sending login request...")
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        
        print(f"Response Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print()
        
        if response.status_code == 200:
            print("✅ LOGIN SUCCESS!")
            response_data = response.json()
            print(f"Response: {json.dumps(response_data, indent=2)}")
        else:
            print("❌ LOGIN FAILED!")
            try:
                error_data = response.json()
                print(f"Error Response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw Response: {response.text}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {e}")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")

if __name__ == "__main__":
    test_login()