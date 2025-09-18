import requests
import json

# Login first
login_data = {
    "email": "celeste.fcp@gmail.com",
    "password": "celeste060291"
}

try:
    # Get token
    login_response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data)
    print(f"Login status: {login_response.status_code}")
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print(f"Token obtained: {token[:20]}...")
        
        # Test agents endpoint
        headers = {"Authorization": f"Bearer {token}"}
        agents_response = requests.get("http://localhost:8000/api/v1/agents", headers=headers)
        
        print(f"Agents endpoint status: {agents_response.status_code}")
        if agents_response.status_code == 200:
            agents_data = agents_response.json()
            print(f"Agents loaded: {len(agents_data.get('agents', []))} agents")
            for agent in agents_data.get('agents', [])[:3]:  # Show first 3
                print(f"  - {agent.get('name', 'Unknown')}: {agent.get('agent_id', 'No ID')}")
        else:
            print(f"Error response: {agents_response.text}")
    else:
        print(f"Login failed: {login_response.text}")
        
except Exception as e:
    print(f"Error: {e}")