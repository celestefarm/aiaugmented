import asyncio
import aiohttp
import json
from typing import Optional

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test User"
}

class WorkspaceTestClient:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.auth_token: Optional[str] = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def register_and_login(self):
        """Register a test user and login to get auth token"""
        try:
            # Try to register user (might fail if already exists)
            async with self.session.post(f"{BASE_URL}/auth/register", json=TEST_USER) as response:
                if response.status not in [200, 201, 400]:  # 400 if user already exists
                    print(f"Registration failed: {response.status}")
                    return False
        except Exception as e:
            print(f"Registration error: {e}")
        
        # Login to get token
        try:
            login_data = {
                "email": TEST_USER["email"],
                "password": TEST_USER["password"]
            }
            async with self.session.post(f"{BASE_URL}/auth/login", json=login_data) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data.get("access_token")
                    print(f"✅ Login successful, token obtained")
                    return True
                else:
                    print(f"❌ Login failed: {response.status}")
                    return False
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False
    
    def get_headers(self):
        """Get headers with authorization token"""
        if not self.auth_token:
            raise ValueError("No auth token available")
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    async def test_create_workspace(self):
        """Test creating a workspace"""
        print("\n🧪 Testing workspace creation...")
        workspace_data = {
            "title": "Test Workspace",
            "settings": {"theme": "dark", "auto_save": True},
            "transform": {"x": 100, "y": 200, "scale": 1.5}
        }
        
        try:
            async with self.session.post(
                f"{BASE_URL}/workspaces",
                json=workspace_data,
                headers=self.get_headers()
            ) as response:
                if response.status == 201:
                    data = await response.json()
                    workspace_id = data.get("id")
                    print(f"✅ Workspace created successfully: {workspace_id}")
                    print(f"   Title: {data.get('title')}")
                    print(f"   Settings: {data.get('settings')}")
                    print(f"   Transform: {data.get('transform')}")
                    return workspace_id
                else:
                    text = await response.text()
                    print(f"❌ Workspace creation failed: {response.status} - {text}")
                    return None
        except Exception as e:
            print(f"❌ Workspace creation error: {e}")
            return None
    
    async def test_list_workspaces(self):
        """Test listing workspaces"""
        print("\n🧪 Testing workspace listing...")
        try:
            async with self.session.get(
                f"{BASE_URL}/workspaces",
                headers=self.get_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    workspaces = data.get("workspaces", [])
                    total = data.get("total", 0)
                    print(f"✅ Workspaces listed successfully: {total} workspaces found")
                    for workspace in workspaces:
                        print(f"   - {workspace.get('title')} (ID: {workspace.get('id')})")
                    return workspaces
                else:
                    text = await response.text()
                    print(f"❌ Workspace listing failed: {response.status} - {text}")
                    return []
        except Exception as e:
            print(f"❌ Workspace listing error: {e}")
            return []
    
    async def test_get_workspace(self, workspace_id: str):
        """Test getting a single workspace"""
        print(f"\n🧪 Testing workspace retrieval for ID: {workspace_id}...")
        try:
            async with self.session.get(
                f"{BASE_URL}/workspaces/{workspace_id}",
                headers=self.get_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Workspace retrieved successfully")
                    print(f"   Title: {data.get('title')}")
                    print(f"   Owner ID: {data.get('owner_id')}")
                    print(f"   Created: {data.get('created_at')}")
                    return data
                else:
                    text = await response.text()
                    print(f"❌ Workspace retrieval failed: {response.status} - {text}")
                    return None
        except Exception as e:
            print(f"❌ Workspace retrieval error: {e}")
            return None
    
    async def test_update_workspace(self, workspace_id: str):
        """Test updating a workspace"""
        print(f"\n🧪 Testing workspace update for ID: {workspace_id}...")
        update_data = {
            "title": "Updated Test Workspace",
            "settings": {"theme": "light", "auto_save": False, "notifications": True},
            "transform": {"x": 50, "y": 75, "scale": 2.0}
        }
        
        try:
            async with self.session.put(
                f"{BASE_URL}/workspaces/{workspace_id}",
                json=update_data,
                headers=self.get_headers()
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Workspace updated successfully")
                    print(f"   New Title: {data.get('title')}")
                    print(f"   New Settings: {data.get('settings')}")
                    print(f"   New Transform: {data.get('transform')}")
                    return data
                else:
                    text = await response.text()
                    print(f"❌ Workspace update failed: {response.status} - {text}")
                    return None
        except Exception as e:
            print(f"❌ Workspace update error: {e}")
            return None
    
    async def test_delete_workspace(self, workspace_id: str):
        """Test deleting a workspace"""
        print(f"\n🧪 Testing workspace deletion for ID: {workspace_id}...")
        try:
            async with self.session.delete(
                f"{BASE_URL}/workspaces/{workspace_id}",
                headers=self.get_headers()
            ) as response:
                if response.status == 204:
                    print(f"✅ Workspace deleted successfully")
                    return True
                else:
                    text = await response.text()
                    print(f"❌ Workspace deletion failed: {response.status} - {text}")
                    return False
        except Exception as e:
            print(f"❌ Workspace deletion error: {e}")
            return False
    
    async def test_access_control(self, workspace_id: str):
        """Test that workspace access is properly controlled"""
        print(f"\n🧪 Testing access control...")
        
        # Try to access workspace without token
        try:
            async with self.session.get(f"{BASE_URL}/workspaces/{workspace_id}") as response:
                if response.status == 401:
                    print("✅ Access denied without authentication token")
                else:
                    print(f"❌ Expected 401, got {response.status}")
        except Exception as e:
            print(f"❌ Access control test error: {e}")

async def run_workspace_tests():
    """Run all workspace CRUD tests"""
    print("🚀 Starting Workspace CRUD Tests")
    print("=" * 50)
    
    async with WorkspaceTestClient() as client:
        # Step 1: Authenticate
        if not await client.register_and_login():
            print("❌ Authentication failed, cannot proceed with tests")
            return
        
        # Step 2: Create workspace
        workspace_id = await client.test_create_workspace()
        if not workspace_id:
            print("❌ Workspace creation failed, cannot proceed with other tests")
            return
        
        # Step 3: List workspaces
        workspaces = await client.test_list_workspaces()
        
        # Step 4: Get single workspace
        workspace_data = await client.test_get_workspace(workspace_id)
        
        # Step 5: Update workspace
        updated_workspace = await client.test_update_workspace(workspace_id)
        
        # Step 6: Test access control
        await client.test_access_control(workspace_id)
        
        # Step 7: Delete workspace
        deleted = await client.test_delete_workspace(workspace_id)
        
        # Step 8: Verify deletion
        if deleted:
            print(f"\n🧪 Verifying workspace deletion...")
            deleted_workspace = await client.test_get_workspace(workspace_id)
            if deleted_workspace is None:
                print("✅ Workspace deletion verified - workspace no longer accessible")
            else:
                print("❌ Workspace deletion verification failed - workspace still accessible")
    
    print("\n" + "=" * 50)
    print("🏁 Workspace CRUD Tests Completed")

if __name__ == "__main__":
    asyncio.run(run_workspace_tests())