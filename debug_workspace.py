import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword123"
}

def debug_workspace_creation():
    print("🔍 Debugging workspace creation...")
    
    # Login to get token
    try:
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            auth_token = token_data.get("access_token")
            print("✅ Login successful")
        else:
            print(f"❌ Login failed: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Create workspace and inspect response
    workspace_data = {
        "title": "Debug Workspace",
        "settings": {"theme": "dark"},
        "transform": {"x": 0, "y": 0, "scale": 1}
    }
    
    try:
        response = requests.post(f"{BASE_URL}/workspaces", json=workspace_data, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 201:
            workspace = response.json()
            print("✅ Workspace created successfully")
            print(f"Full Response: {json.dumps(workspace, indent=2)}")
            
            # Check each field
            print(f"ID: {workspace.get('id')} (type: {type(workspace.get('id'))})")
            print(f"_ID: {workspace.get('_id')} (type: {type(workspace.get('_id'))})")
            print(f"Title: {workspace.get('title')}")
            print(f"Owner ID: {workspace.get('owner_id')}")
            print(f"Created At: {workspace.get('created_at')}")
            print(f"Settings: {workspace.get('settings')}")
            print(f"Transform: {workspace.get('transform')}")
            
            return workspace.get('_id')  # Use _id since that's what's returned
        else:
            print(f"❌ Workspace creation failed: {response.status_code}")
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Workspace creation error: {e}")
        return None

if __name__ == "__main__":
    debug_workspace_creation()