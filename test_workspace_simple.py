import requests
import json

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
}

def test_workspace_crud():
    """Test workspace CRUD operations using requests library"""
    print("🚀 Starting Workspace CRUD Tests")
    print("=" * 50)
    
    # Step 1: Register and login
    print("\n🧪 Testing authentication...")
    
    # Try to register (might fail if user exists)
    try:
        response = requests.post(f"{BASE_URL}/auth/signup", json=TEST_USER)
        if response.status_code in [200, 201]:
            print("✅ User registered successfully")
        elif response.status_code == 400:
            print("ℹ️ User already exists, proceeding to login")
        else:
            print(f"❌ Registration failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Registration error: {e}")
    
    # Login to get token
    try:
        login_data = {"email": TEST_USER["email"], "password": TEST_USER["password"]}
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            token_data = response.json()
            auth_token = token_data.get("access_token")
            print("✅ Login successful, token obtained")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    headers = {"Authorization": f"Bearer {auth_token}"}
    
    # Step 2: Create workspace
    print("\n🧪 Testing workspace creation...")
    workspace_data = {
        "title": "Test Workspace",
        "settings": {"theme": "dark", "auto_save": True},
        "transform": {"x": 100, "y": 200, "scale": 1.5}
    }
    
    try:
        response = requests.post(f"{BASE_URL}/workspaces", json=workspace_data, headers=headers)
        if response.status_code == 201:
            workspace = response.json()
            workspace_id = workspace.get("_id")  # Use _id since that's what's returned
            print(f"✅ Workspace created successfully: {workspace_id}")
            print(f"   Title: {workspace.get('title')}")
            print(f"   Settings: {workspace.get('settings')}")
            print(f"   Transform: {workspace.get('transform')}")
        else:
            print(f"❌ Workspace creation failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Workspace creation error: {e}")
        return
    
    # Step 3: List workspaces
    print("\n🧪 Testing workspace listing...")
    try:
        response = requests.get(f"{BASE_URL}/workspaces", headers=headers)
        if response.status_code == 200:
            data = response.json()
            workspaces = data.get("workspaces", [])
            total = data.get("total", 0)
            print(f"✅ Workspaces listed successfully: {total} workspaces found")
            for workspace in workspaces:
                print(f"   - {workspace.get('title')} (ID: {workspace.get('id')})")
        else:
            print(f"❌ Workspace listing failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Workspace listing error: {e}")
    
    # Step 4: Get single workspace
    print(f"\n🧪 Testing workspace retrieval for ID: {workspace_id}...")
    try:
        response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}", headers=headers)
        if response.status_code == 200:
            workspace = response.json()
            print(f"✅ Workspace retrieved successfully")
            print(f"   Title: {workspace.get('title')}")
            print(f"   Owner ID: {workspace.get('owner_id')}")
            print(f"   Created: {workspace.get('created_at')}")
        else:
            print(f"❌ Workspace retrieval failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Workspace retrieval error: {e}")
    
    # Step 5: Update workspace
    print(f"\n🧪 Testing workspace update for ID: {workspace_id}...")
    update_data = {
        "title": "Updated Test Workspace",
        "settings": {"theme": "light", "auto_save": False, "notifications": True},
        "transform": {"x": 50, "y": 75, "scale": 2.0}
    }
    
    try:
        response = requests.put(f"{BASE_URL}/workspaces/{workspace_id}", json=update_data, headers=headers)
        if response.status_code == 200:
            workspace = response.json()
            print(f"✅ Workspace updated successfully")
            print(f"   New Title: {workspace.get('title')}")
            print(f"   New Settings: {workspace.get('settings')}")
            print(f"   New Transform: {workspace.get('transform')}")
        else:
            print(f"❌ Workspace update failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Workspace update error: {e}")
    
    # Step 6: Test access control
    print(f"\n🧪 Testing access control...")
    try:
        response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}")  # No auth header
        if response.status_code == 401:
            print("✅ Access denied without authentication token")
        else:
            print(f"❌ Expected 401, got {response.status_code}")
    except Exception as e:
        print(f"❌ Access control test error: {e}")
    
    # Step 7: Delete workspace
    print(f"\n🧪 Testing workspace deletion for ID: {workspace_id}...")
    try:
        response = requests.delete(f"{BASE_URL}/workspaces/{workspace_id}", headers=headers)
        if response.status_code == 204:
            print(f"✅ Workspace deleted successfully")
        else:
            print(f"❌ Workspace deletion failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Workspace deletion error: {e}")
        return
    
    # Step 8: Verify deletion
    print(f"\n🧪 Verifying workspace deletion...")
    try:
        response = requests.get(f"{BASE_URL}/workspaces/{workspace_id}", headers=headers)
        if response.status_code == 404:
            print("✅ Workspace deletion verified - workspace no longer accessible")
        else:
            print(f"❌ Workspace deletion verification failed - got status {response.status_code}")
    except Exception as e:
        print(f"❌ Workspace deletion verification error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Workspace CRUD Tests Completed")

if __name__ == "__main__":
    test_workspace_crud()