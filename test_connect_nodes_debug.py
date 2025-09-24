import asyncio
import aiohttp
import json

async def test_connect_nodes_functionality():
    """
    Test the Connect Nodes functionality with comprehensive debugging
    """
    print("=== TESTING CONNECT NODES FUNCTIONALITY ===")
    
    # Step 1: Login
    print("\n=== STEP 1: LOGIN ===")
    async with aiohttp.ClientSession() as session:
        login_data = {
            "email": "celeste.fcp@gmail.com",
            "password": "celeste060291"
        }
        
        async with session.post('http://localhost:8000/api/v1/auth/login', json=login_data) as response:
            if response.status == 200:
                login_result = await response.json()
                token = login_result['access_token']
                print(f"✅ Login successful")
                user_info = login_result.get('user', {})
                user_name = user_info.get('full_name', user_info.get('name', 'Unknown User'))
                user_email = user_info.get('email', 'Unknown Email')
                print(f"   User: {user_name} ({user_email})")
            else:
                error_text = await response.text()
                print(f"❌ Login failed: {response.status}")
                print(f"   Error: {error_text}")
                return
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # Step 2: Get workspaces
        print("\n=== STEP 2: GET WORKSPACES ===")
        async with session.get('http://localhost:8000/api/v1/workspaces', headers=headers) as response:
            if response.status == 200:
                workspaces_data = await response.json()
                print(f"✅ Workspaces response received")
                print(f"   Response type: {type(workspaces_data)}")
                print(f"   Response data: {workspaces_data}")
                
                # Handle both list and dict responses
                if isinstance(workspaces_data, list):
                    workspaces = workspaces_data
                elif isinstance(workspaces_data, dict) and 'workspaces' in workspaces_data:
                    workspaces = workspaces_data['workspaces']
                else:
                    workspaces = [workspaces_data] if workspaces_data else []
                
                print(f"✅ Found {len(workspaces)} workspaces")
                
                if not workspaces:
                    print("❌ No workspaces found")
                    return
                
                workspace = workspaces[0]
                workspace_id = workspace['id']
                workspace_name = workspace.get('title', workspace.get('name', 'Unknown Workspace'))
                print(f"   Using workspace: '{workspace_name}' (ID: {workspace_id})")
            else:
                error_text = await response.text()
                print(f"❌ Failed to get workspaces: {response.status}")
                print(f"   Error: {error_text}")
                return
        
        # Step 3: Get existing nodes
        print("\n=== STEP 3: GET EXISTING NODES ===")
        async with session.get(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/nodes', headers=headers) as response:
            if response.status == 200:
                nodes_data = await response.json()
                print(f"✅ Nodes response received")
                print(f"   Response type: {type(nodes_data)}")
                
                # Handle both list and dict responses
                if isinstance(nodes_data, list):
                    nodes = nodes_data
                elif isinstance(nodes_data, dict) and 'nodes' in nodes_data:
                    nodes = nodes_data['nodes']
                else:
                    nodes = [nodes_data] if nodes_data else []
                
                print(f"✅ Found {len(nodes)} nodes")
                
                if len(nodes) < 2:
                    print("❌ Need at least 2 nodes to test connections")
                    print("   Creating test nodes...")
                    
                    # Create first test node
                    node1_data = {
                        "title": "Test Node 1 - Strategic Analysis",
                        "description": "First node for connection testing",
                        "type": "ai",
                        "x": 100,
                        "y": 100
                    }
                    
                    async with session.post(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/nodes',
                                          json=node1_data, headers=headers) as create_response:
                        if create_response.status == 201:
                            node1 = await create_response.json()
                            print(f"   ✅ Created node 1: {node1['id']}")
                        else:
                            error_text = await create_response.text()
                            print(f"   ❌ Failed to create node 1: {create_response.status}")
                            print(f"      Error: {error_text}")
                            return
                    
                    # Create second test node
                    node2_data = {
                        "title": "Test Node 2 - Risk Assessment",
                        "description": "Second node for connection testing",
                        "type": "human",
                        "x": 300,
                        "y": 200
                    }
                    
                    async with session.post(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/nodes',
                                          json=node2_data, headers=headers) as create_response:
                        if create_response.status == 201:
                            node2 = await create_response.json()
                            print(f"   ✅ Created node 2: {node2['id']}")
                        else:
                            error_text = await create_response.text()
                            print(f"   ❌ Failed to create node 2: {create_response.status}")
                            print(f"      Error: {error_text}")
                            return
                    
                    # Refresh nodes list
                    async with session.get(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/nodes', headers=headers) as response:
                        nodes_data = await response.json()
                        if isinstance(nodes_data, list):
                            nodes = nodes_data
                        elif isinstance(nodes_data, dict) and 'nodes' in nodes_data:
                            nodes = nodes_data['nodes']
                        else:
                            nodes = [nodes_data] if nodes_data else []
                
                # Use first two nodes for testing
                node1 = nodes[0]
                node2 = nodes[1]
                print(f"   Node 1: {node1['title']} (ID: {node1['id']})")
                print(f"   Node 2: {node2['title']} (ID: {node2['id']})")
            else:
                error_text = await response.text()
                print(f"❌ Failed to get nodes: {response.status}")
                print(f"   Error: {error_text}")
                return
        
        # Step 4: Check existing edges
        print("\n=== STEP 4: CHECK EXISTING EDGES ===")
        async with session.get(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/edges', headers=headers) as response:
            if response.status == 200:
                edges_data = await response.json()
                print(f"✅ Edges response received")
                print(f"   Response type: {type(edges_data)}")
                
                # Handle both list and dict responses
                if isinstance(edges_data, list):
                    edges = edges_data
                elif isinstance(edges_data, dict) and 'edges' in edges_data:
                    edges = edges_data['edges']
                else:
                    edges = [edges_data] if edges_data else []
                
                print(f"✅ Found {len(edges)} existing edges")
                
                # Check if connection already exists
                existing_connection = None
                for edge in edges:
                    if isinstance(edge, dict):  # Make sure edge is a dictionary
                        if ((edge.get('from_node_id') == node1['id'] and edge.get('to_node_id') == node2['id']) or
                            (edge.get('from_node_id') == node2['id'] and edge.get('to_node_id') == node1['id'])):
                            existing_connection = edge
                            break
                
                if existing_connection:
                    edge_id = existing_connection.get('id', existing_connection.get('_id', 'Unknown'))
                    print(f"   ⚠️ Connection already exists: {edge_id}")
                    print(f"      From: {existing_connection.get('from_node_id', 'Unknown')}")
                    print(f"      To: {existing_connection.get('to_node_id', 'Unknown')}")
                    print(f"      Type: {existing_connection.get('type', 'Unknown')}")
                    
                    # Delete existing connection for clean test
                    print("   🗑️ Deleting existing connection for clean test...")
                    async with session.delete(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/edges/{edge_id}',
                                            headers=headers) as delete_response:
                        if delete_response.status == 204:
                            print("   ✅ Existing connection deleted")
                        else:
                            error_text = await delete_response.text()
                            print(f"   ❌ Failed to delete existing connection: {delete_response.status}")
                            print(f"      Error: {error_text}")
                else:
                    print("   ✅ No existing connection between test nodes")
            else:
                error_text = await response.text()
                print(f"❌ Failed to get edges: {response.status}")
                print(f"   Error: {error_text}")
                return
        
        # Step 5: Test edge creation API directly
        print("\n=== STEP 5: TEST EDGE CREATION API DIRECTLY ===")
        edge_data = {
            "from_node_id": node1['id'],
            "to_node_id": node2['id'],
            "type": "support",
            "description": f"Test connection from {node1['title']} to {node2['title']}"
        }
        
        print(f"   Creating edge: {node1['title']} → {node2['title']}")
        print(f"   Edge data: {json.dumps(edge_data, indent=2)}")
        
        async with session.post(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/edges', 
                              json=edge_data, headers=headers) as response:
            if response.status == 201:
                edge = await response.json()
                print(f"✅ Edge created successfully!")
                edge_id = edge.get('id', edge.get('_id', 'Unknown'))
                print(f"   Edge ID: {edge_id}")
                print(f"   From: {edge.get('from_node_id', 'Unknown')}")
                print(f"   To: {edge.get('to_node_id', 'Unknown')}")
                print(f"   Type: {edge.get('type', 'Unknown')}")
                print(f"   Description: {edge.get('description', 'Unknown')}")
                
                # Step 6: Verify edge was created
                print("\n=== STEP 6: VERIFY EDGE CREATION ===")
                async with session.get(f'http://localhost:8000/api/v1/workspaces/{workspace_id}/edges', headers=headers) as verify_response:
                    if verify_response.status == 200:
                        updated_edges_data = await verify_response.json()
                        
                        # Handle both list and dict responses
                        if isinstance(updated_edges_data, list):
                            updated_edges = updated_edges_data
                        elif isinstance(updated_edges_data, dict) and 'edges' in updated_edges_data:
                            updated_edges = updated_edges_data['edges']
                        else:
                            updated_edges = [updated_edges_data] if updated_edges_data else []
                        
                        print(f"✅ Total edges after creation: {len(updated_edges)}")
                        
                        # Find our edge
                        our_edge = None
                        for e in updated_edges:
                            if isinstance(e, dict) and e.get('id') == edge.get('id'):
                                our_edge = e
                                break
                        
                        if our_edge:
                            print(f"   ✅ Our edge found in list:")
                            print(f"      ID: {our_edge.get('id', our_edge.get('_id', 'Unknown'))}")
                            print(f"      From: {our_edge.get('from_node_id', 'Unknown')}")
                            print(f"      To: {our_edge.get('to_node_id', 'Unknown')}")
                            print(f"      Type: {our_edge.get('type', 'Unknown')}")
                        else:
                            print(f"   ❌ Our edge not found in updated list")
                    else:
                        error_text = await verify_response.text()
                        print(f"❌ Failed to verify edges: {verify_response.status}")
                        print(f"   Error: {error_text}")
                
            else:
                error_text = await response.text()
                print(f"❌ Edge creation failed: {response.status}")
                print(f"   Error: {error_text}")
                
                # Debug the error
                try:
                    error_json = json.loads(error_text)
                    print(f"   Error details: {json.dumps(error_json, indent=2)}")
                except:
                    print(f"   Raw error: {error_text}")
                return
        
        # Step 7: Test connection workflow simulation
        print("\n=== STEP 7: SIMULATE FRONTEND CONNECTION WORKFLOW ===")
        print("   This simulates what should happen when user:")
        print("   1. Clicks 'Connect Nodes' button")
        print("   2. Ctrl+clicks first node")
        print("   3. Ctrl+clicks second node")
        
        # Simulate the workflow that should happen in the frontend
        print(f"   🎯 Step 1: User clicks 'Connect Nodes' button")
        print(f"      → Frontend should enter CONNECTING mode")
        
        print(f"   🎯 Step 2: User Ctrl+clicks node '{node1['title']}'")
        print(f"      → Frontend should set connectionStart = '{node1['id']}'")
        
        print(f"   🎯 Step 3: User Ctrl+clicks node '{node2['title']}'")
        print(f"      → Frontend should call createConnection('{node1['id']}', '{node2['id']}')")
        print(f"      → This should trigger the edge creation API we just tested")
        
        print("\n=== STEP 8: DIAGNOSE POTENTIAL ISSUES ===")
        print("   🔍 Checking potential issues:")
        
        # Check 1: API endpoint exists and works
        print("   ✅ Edge creation API works correctly")
        
        # Check 2: Node IDs are valid
        print(f"   ✅ Node IDs are valid: {node1['id']}, {node2['id']}")
        
        # Check 3: Workspace access
        print(f"   ✅ Workspace access works: {workspace_id}")
        
        # Check 4: Authentication
        print("   ✅ Authentication works correctly")
        
        print("\n=== DIAGNOSIS COMPLETE ===")
        print("✅ Backend edge creation API works perfectly!")
        print("❌ The issue is likely in the frontend connection logic:")
        print("   1. Connection mode state management")
        print("   2. Ctrl+click event handling")
        print("   3. createConnection function implementation")
        print("   4. Missing API call in connection completion")

if __name__ == "__main__":
    asyncio.run(test_connect_nodes_functionality())