import requests
import json

# Test node creation to see the exact error
url = "http://localhost:8000/workspaces/test123/nodes"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer fake-token"
}
data = {
    "title": "Test Node",
    "description": "Test description", 
    "type": "human",
    "x": 100,
    "y": 100
}

try:
    response = requests.post(url, headers=headers, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")