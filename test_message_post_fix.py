#!/usr/bin/env python3
"""
Test script to verify that the backend message endpoint works correctly
by sending a POST request directly to the API.
"""

import requests
import json

def test_message_post():
    """Test sending a message to the backend API"""
    
    # Backend URL
    base_url = "http://localhost:8000"
    
    # Test workspace ID from the logs
    workspace_id = "68dab57b0fe367aa3a32b315"
    
    # Test message data
    message_data = {
        "content": "Hello, this is a test message to verify the AI agent chat functionality works.",
        "agent_id": None  # Let the backend handle agent selection
    }
    
    # Headers
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    print("🧪 Testing POST request to message endpoint...")
    print(f"URL: {base_url}/api/v1/workspaces/{workspace_id}/messages")
    print(f"Data: {json.dumps(message_data, indent=2)}")
    print()
    
    try:
        # Send POST request
        response = requests.post(
            f"{base_url}/api/v1/workspaces/{workspace_id}/messages",
            json=message_data,
            headers=headers,
            timeout=30
        )
        
        print(f"✅ Response Status: {response.status_code}")
        print(f"✅ Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ SUCCESS: Message endpoint is working!")
            try:
                response_data = response.json()
                print(f"✅ Response Data: {json.dumps(response_data, indent=2)}")
            except:
                print(f"✅ Response Text: {response.text}")
        elif response.status_code == 401:
            print("⚠️  AUTHENTICATION REQUIRED: Need to authenticate first")
            print("This is expected - the backend requires authentication")
        else:
            print(f"❌ UNEXPECTED STATUS: {response.status_code}")
            print(f"Response: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Cannot connect to backend")
        print("Make sure the backend is running on localhost:8000")
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT ERROR: Request timed out")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    test_message_post()