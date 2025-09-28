#!/usr/bin/env python3
"""
Simple script to create a test user for session persistence testing.
"""

import requests
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "password123"
TEST_NAME = "Test User"

def create_test_user():
    """Create a test user for session persistence testing"""
    print("=== CREATING TEST USER ===")
    
    # Try to create the user
    print(f"Creating user: {TEST_EMAIL}")
    signup_response = requests.post(f"{API_BASE_URL}/auth/signup", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": TEST_NAME
    })
    
    if signup_response.status_code == 200:
        print("✅ Test user created successfully")
        signup_data = signup_response.json()
        user_id = signup_data["user"]["_id"]
        print(f"User ID: {user_id}")
        return True
    elif signup_response.status_code == 400 and "already registered" in signup_response.text:
        print("✅ Test user already exists")
        return True
    else:
        print(f"❌ Failed to create test user: {signup_response.status_code}")
        print(f"Response: {signup_response.text}")
        return False

if __name__ == "__main__":
    create_test_user()