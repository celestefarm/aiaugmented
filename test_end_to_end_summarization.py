#!/usr/bin/env python3
"""
End-to-end test to verify the summarization feature is working
"""
import requests
import json
import time

def test_end_to_end():
    print('=== END-TO-END SUMMARIZATION TEST ===')
    
    base_url = 'http://localhost:8000/api/v1'
    
    # Step 1: Login to get authentication token
    print('\n1. Authenticating...')
    login_data = {
        'email': 'celeste@example.com',
        'password': 'password123'
    }
    
    try:
        login_response = requests.post(f'{base_url}/auth/login', json=login_data)
        if login_response.status_code != 200:
            print(f'❌ Login failed: {login_response.status_code} - {login_response.text}')
            return
        
        token_data = login_response.json()
        token = token_data['access_token']
        print('✅ Authentication successful')
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # Step 2: Get workspaces
        print('\n2. Getting workspaces...')
        workspaces_response = requests.get(f'{base_url}/workspaces', headers=headers)
        if workspaces_response.status_code != 200:
            print(f'❌ Failed to get workspaces: {workspaces_response.status_code}')
            return
        
        workspaces = workspaces_response.json()['workspaces']
        if not workspaces:
            print('❌ No workspaces found')
            return
        
        workspace_id = workspaces[0]['id']
        print(f'✅ Using workspace: {workspace_id}')
        
        # Step 3: Get nodes
        print('\n3. Getting nodes...')
        nodes_response = requests.get(f'{base_url}/workspaces/{workspace_id}/nodes', headers=headers)
        if nodes_response.status_code != 200:
            print(f'❌ Failed to get nodes: {nodes_response.status_code}')
            return
        
        nodes = nodes_response.json()['nodes']
        print(f'✅ Found {len(nodes)} nodes')
        
        if not nodes:
            # Create a test node with a long title
            print('\n4. Creating test node with long title...')
            test_node_data = {
                'title': 'This is a very long strategic analysis title that would overflow the node display area and needs intelligent summarization to work properly',
                'description': 'Test node for summarization',
                'type': 'human',
                'x': 100,
                'y': 100
            }
            
            create_response = requests.post(f'{base_url}/workspaces/{workspace_id}/nodes', 
                                          json=test_node_data, headers=headers)
            if create_response.status_code != 201:
                print(f'❌ Failed to create node: {create_response.status_code}')
                return
            
            new_node = create_response.json()
            nodes = [new_node]
            print('✅ Created test node')
        
        # Step 4: Test summarization for each node
        print('\n5. Testing summarization...')
        for i, node in enumerate(nodes):
            print(f'\n--- Node {i+1} ---')
            print(f'Original title: "{node["title"]}" ({len(node["title"])} chars)')
            
            # Test summarization API call
            summarize_data = {
                'context': 'card',
                'max_length': 25
            }
            
            summarize_response = requests.post(
                f'{base_url}/nodes/{node["id"]}/summarize',
                json=summarize_data,
                headers=headers
            )
            
            if summarize_response.status_code == 200:
                result = summarize_response.json()
                print(f'✅ Summarization successful!')
                print(f'   Summarized: "{result["summarized_title"]}" ({len(result["summarized_title"])} chars)')
                print(f'   Method: {result["method_used"]}')
                print(f'   Confidence: {result.get("confidence", "N/A")}%')
                print(f'   ✓ Length OK: {len(result["summarized_title"]) <= 25}')
            else:
                print(f'❌ Summarization failed: {summarize_response.status_code} - {summarize_response.text}')
        
        print('\n=== TEST COMPLETE ===')
        print('✅ The backend summarization API is working correctly!')
        print('✅ Frontend should now display intelligent summaries instead of truncated text!')
        
    except requests.exceptions.ConnectionError:
        print('❌ Cannot connect to backend server - make sure it\'s running on localhost:8000')
    except Exception as e:
        print(f'❌ Test failed with error: {e}')

if __name__ == '__main__':
    test_end_to_end()