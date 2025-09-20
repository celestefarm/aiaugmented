#!/usr/bin/env python3
"""
Test script to verify the node update ObjectId fix is working.
"""

import asyncio
import aiohttp
import json

async def test_node_update():
    """Test node update functionality"""
    
    # Test credentials (using the celeste user from previous tests)
    login_data = {
        "email": "celeste@example.com",
        "password": "password123"
    }
    
    base_url = "http://localhost:8000/api/v1"
    
    async with aiohttp.ClientSession() as session:
        print("=== Testing Node Update Fix ===")
        
        # 1. Login to get token
        print("1. Logging in...")
        async with session.post(f"{base_url}/auth/login", json=login_data) as response:
            if response.status != 200:
                print(f"❌ Login failed: {response.status}")
                text = await response.text()
                print(f"Response: {text}")
                return
            
            login_result = await response.json()
            token = login_result["access_token"]
            user_id = login_result["user"]["id"]
            print(f"✅ Login successful, user ID: {user_id}")
        
        # Set authorization header
        headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Get workspaces
        print("2. Getting workspaces...")
        async with session.get(f"{base_url}/workspaces", headers=headers) as response:
            if response.status != 200:
                print(f"❌ Failed to get workspaces: {response.status}")
                return
            
            workspaces = await response.json()
            if not workspaces:
                print("❌ No workspaces found")
                return
            
            workspace_id = workspaces[0]["id"]
            print(f"✅ Using workspace: {workspace_id}")
        
        # 3. Get existing nodes
        print("3. Getting existing nodes...")
        async with session.get(f"{base_url}/workspaces/{workspace_id}/nodes", headers=headers) as response:
            if response.status != 200:
                print(f"❌ Failed to get nodes: {response.status}")
                return
            
            nodes_data = await response.json()
            nodes = nodes_data.get("nodes", [])
            
            if not nodes:
                print("❌ No nodes found to test update")
                return
            
            test_node = nodes[0]
            node_id = test_node["id"]
            print(f"✅ Found test node: {node_id} - '{test_node['title']}'")
        
        # 4. Test node update (this was failing before the fix)
        print("4. Testing node update...")
        update_data = {
            "title": f"Updated Title - {asyncio.get_event_loop().time()}",
            "x": test_node["x"] + 10,  # Move slightly
            "y": test_node["y"] + 10
        }
        
        async with session.put(f"{base_url}/workspaces/{workspace_id}/nodes/{node_id}", 
                              json=update_data, headers=headers) as response:
            
            print(f"Update response status: {response.status}")
            
            if response.status == 200:
                updated_node = await response.json()
                print(f"✅ Node update successful!")
                print(f"   New title: {updated_node['title']}")
                print(f"   New position: ({updated_node['x']}, {updated_node['y']})")
                return True
            else:
                print(f"❌ Node update failed: {response.status}")
                error_text = await response.text()
                print(f"Error details: {error_text}")
                return False

if __name__ == "__main__":
    success = asyncio.run(test_node_update())
    if success:
        print("\n🎉 Node update fix is working correctly!")
    else:
        print("\n💥 Node update is still failing")