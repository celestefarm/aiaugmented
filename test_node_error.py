import requests
import json
from bson import ObjectId

# Test the node creation error
base_url = "http://localhost:8000/api/v1"

# First, let's try to create a user and get a token
print("=== Testing Node Creation Error ===")

# Create a test user
signup_data = {
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
}

try:
    # Try to signup (might fail if user exists, that's ok)
    signup_response = requests.post(f"{base_url}/auth/signup", json=signup_data)
    print(f"Signup Status: {signup_response.status_code}")
    
    # Login to get token
    login_data = {
        "email": "test@example.com", 
        "password": "testpassword123"
    }
    
    login_response = requests.post(f"{base_url}/auth/login", json=login_data)
    print(f"Login Status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token_data = login_response.json()
        token = token_data["access_token"]
        user_id = token_data["user"].get("id") or token_data["user"].get("_id")
        print(f"Got token for user: {user_id}")
        print(f"Full user data: {token_data['user']}")
        
        # Create a workspace
        workspace_data = {
            "title": "Test Workspace"
        }
        
        headers = {"Authorization": f"Bearer {token}"}
        workspace_response = requests.post(f"{base_url}/workspaces", json=workspace_data, headers=headers)
        print(f"Workspace creation Status: {workspace_response.status_code}")
        
        if workspace_response.status_code == 201:
            workspace = workspace_response.json()
            workspace_id = workspace["id"]
            print(f"Created workspace: {workspace_id}")
            
            # Now try to create a node - this should trigger the error
            node_data = {
                "title": "Test Node",
                "description": "Test description",
                "type": "human", 
                "x": 100,
                "y": 100
            }
            
            print(f"\n=== Attempting to create node in workspace {workspace_id} ===")
            node_response = requests.post(f"{base_url}/workspaces/{workspace_id}/nodes", json=node_data, headers=headers)
            print(f"Node creation Status: {node_response.status_code}")
            print(f"Node creation Response: {node_response.text}")
            
        else:
            print(f"Workspace creation failed: {workspace_response.text}")
    else:
        print(f"Login failed: {login_response.text}")
        
except Exception as e:
    print(f"Error during test: {e}")