#!/usr/bin/env python3
"""
Test script to verify that the node ID fix is working.
This script will test the API endpoints to ensure nodes now return 'id' instead of '_id'.
"""

import requests
import json

def test_node_api():
    base_url = "http://localhost:8000/api/v1"
    
    # Test token (you may need to update this)
    token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2N2Y4ZGJkNzNkNzI4YzI4YzY4ZjU4YjciLCJleHAiOjE3MzQ3MjM2MDB9.eyjhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    print("🔍 Testing Node ID Fix...")
    print("=" * 50)
    
    try:
        # First, get workspaces
        print("1. Getting workspaces...")
        workspaces_response = requests.get(f"{base_url}/workspaces", headers=headers)
        
        if workspaces_response.status_code != 200:
            print(f"❌ Failed to get workspaces: {workspaces_response.status_code}")
            print(f"Response: {workspaces_response.text}")
            return
            
        workspaces_data = workspaces_response.json()
        print(f"✅ Got {len(workspaces_data.get('workspaces', []))} workspaces")
        
        if not workspaces_data.get('workspaces'):
            print("❌ No workspaces found")
            return
            
        # Get the first workspace
        workspace_id = workspaces_data['workspaces'][0]['id']
        print(f"📁 Using workspace: {workspace_id}")
        
        # Test getting nodes
        print("\n2. Getting nodes...")
        nodes_response = requests.get(f"{base_url}/workspaces/{workspace_id}/nodes", headers=headers)
        
        if nodes_response.status_code != 200:
            print(f"❌ Failed to get nodes: {nodes_response.status_code}")
            print(f"Response: {nodes_response.text}")
            return
            
        nodes_data = nodes_response.json()
        nodes = nodes_data.get('nodes', [])
        print(f"✅ Got {len(nodes)} nodes")
        
        if not nodes:
            print("ℹ️  No nodes found, creating a test node...")
            
            # Create a test node
            test_node = {
                "title": "Test Node for ID Fix",
                "description": "Testing that node IDs are properly returned",
                "type": "human",
                "x": 100,
                "y": 100
            }
            
            create_response = requests.post(
                f"{base_url}/workspaces/{workspace_id}/nodes", 
                headers=headers,
                json=test_node
            )
            
            if create_response.status_code != 201:
                print(f"❌ Failed to create test node: {create_response.status_code}")
                print(f"Response: {create_response.text}")
                return
                
            created_node = create_response.json()
            nodes = [created_node]
            print("✅ Created test node")
        
        # Check the node structure
        print("\n3. Analyzing node structure...")
        for i, node in enumerate(nodes[:3]):  # Check first 3 nodes
            print(f"\nNode {i+1}:")
            print(f"  Title: {node.get('title', 'N/A')}")
            
            # Check for 'id' field
            if 'id' in node:
                print(f"  ✅ 'id' field present: {node['id']}")
            else:
                print("  ❌ 'id' field MISSING")
                
            # Check for '_id' field (should not be present in response)
            if '_id' in node:
                print(f"  ⚠️  '_id' field present: {node['_id']} (this should not be here)")
            else:
                print("  ✅ '_id' field correctly absent")
                
            # Show all keys for debugging
            print(f"  All keys: {list(node.keys())}")
        
        # Summary
        print("\n" + "=" * 50)
        print("🎯 SUMMARY:")
        
        nodes_with_id = sum(1 for node in nodes if 'id' in node)
        nodes_with_underscore_id = sum(1 for node in nodes if '_id' in node)
        
        print(f"  Nodes with 'id' field: {nodes_with_id}/{len(nodes)}")
        print(f"  Nodes with '_id' field: {nodes_with_underscore_id}/{len(nodes)}")
        
        if nodes_with_id == len(nodes) and nodes_with_underscore_id == 0:
            print("  🎉 SUCCESS: All nodes have 'id' field and no '_id' field!")
            print("  🎯 The drag-and-drop fix should now work!")
        else:
            print("  ❌ ISSUE: Some nodes still have incorrect ID structure")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server. Is it running on localhost:8000?")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_node_api()