#!/usr/bin/env python3
import requests
import json

def test_login():
    url = "http://localhost:8000/api/v1/auth/login"
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    print("=== TESTING LOGIN API ===")
    print(f"URL: {url}")
    print(f"Headers: {headers}")
    print(f"Data: {data}")
    print()
    
    try:
        response = requests.post(url, headers=headers, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Text: {response.text}")
        
        if response.status_code == 200:
            print("✅ Login successful!")
            return response.json()
        else:
            print("❌ Login failed!")
            return None
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return None

if __name__ == "__main__":
    test_login()