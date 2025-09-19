#!/usr/bin/env python3
"""
Test script to verify the API endpoint for summarization
"""
import requests
import json

def test_api_endpoint():
    print('=== API ENDPOINT TEST ===')
    
    # First, let's check if the endpoint exists by testing with a mock node
    base_url = 'http://localhost:8000/api/v1'
    
    # Test the summarization endpoint
    node_id = '507f1f77bcf86cd799439011'  # Mock ObjectId
    endpoint = f'{base_url}/nodes/{node_id}/summarize'
    
    payload = {
        'context': 'card',
        'max_length': 25
    }
    
    print(f'Testing endpoint: {endpoint}')
    print(f'Payload: {payload}')
    
    try:
        response = requests.post(endpoint, json=payload)
        print(f'Status Code: {response.status_code}')
        print(f'Response Headers: {dict(response.headers)}')
        
        if response.status_code == 200:
            print('✓ Endpoint exists and responds')
            print(f'Response: {response.json()}')
        elif response.status_code == 401:
            print('⚠ Authentication required (expected)')
        elif response.status_code == 404:
            print('✗ Endpoint not found - this is the issue!')
        else:
            print(f'Response: {response.text}')
            
    except requests.exceptions.ConnectionError:
        print('✗ Cannot connect to backend server')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    test_api_endpoint()