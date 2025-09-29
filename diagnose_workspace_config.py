#!/usr/bin/env python3
"""
Simple diagnostic script to check workspace configuration differences
between test and regular accounts without importing backend modules.
"""

import requests
import json

def check_workspace_config():
    """Check workspace configuration via API calls"""
    base_url = "http://localhost:8000/api/v1"
    
    print("=== WORKSPACE CONFIGURATION DIAGNOSIS ===\n")
    
    # Check if backend is running
    try:
        health_response = requests.get(f"{base_url}/healthz")
        if health_response.status_code == 200:
            print("✅ Backend is running")
        else:
            print("❌ Backend health check failed")
            return
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot connect to backend: {e}")
        return
    
    # Test accounts to check
    test_accounts = [
        {"email": "celetes@testing.com", "name": "Celeste FCP", "password": "testpass"},
        {"email": "test@example.com", "name": "Test User", "password": "testpass"}
    ]
    
    regular_account = {"email": "celeste.fcp@gmail.com", "name": "Celeste FCP", "password": "testpass"}
    
    print("\n=== CHECKING ACCOUNT CONFIGURATIONS ===\n")
    
    # Check each account type
    for account_type, accounts in [("TEST", test_accounts), ("REGULAR", [regular_account])]:
        print(f"--- {account_type} ACCOUNTS ---")
        
        for account in accounts:
            print(f"\nChecking account: {account['email']}")
            
            # Try to login
            try:
                login_response = requests.post(f"{base_url}/auth/login", json={
                    "email": account["email"],
                    "password": account["password"]
                })
                
                if login_response.status_code == 200:
                    token = login_response.json().get("access_token")
                    headers = {"Authorization": f"Bearer {token}"}
                    print(f"  ✅ Login successful")
                    
                    # Get workspaces
                    workspaces_response = requests.get(f"{base_url}/workspaces", headers=headers)
                    if workspaces_response.status_code == 200:
                        workspaces = workspaces_response.json()
                        print(f"  📁 Found {len(workspaces)} workspaces")
                        
                        for i, workspace in enumerate(workspaces):
                            workspace_id = workspace.get("id")
                            workspace_name = workspace.get("name", "Unnamed")
                            active_agents = workspace.get("active_agents", [])
                            
                            print(f"    Workspace {i+1}: {workspace_name}")
                            print(f"      ID: {workspace_id}")
                            print(f"      Active Agents: {active_agents}")
                            
                            if not active_agents:
                                print(f"      ⚠️  NO ACTIVE AGENTS - This explains the chat issue!")
                            else:
                                print(f"      ✅ Has active agents: {', '.join(active_agents)}")
                    else:
                        print(f"  ❌ Failed to get workspaces: {workspaces_response.status_code}")
                        
                elif login_response.status_code == 401:
                    print(f"  ❌ Login failed - Invalid credentials")
                else:
                    print(f"  ❌ Login failed: {login_response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                print(f"  ❌ Request failed: {e}")
    
    print("\n=== DIAGNOSIS SUMMARY ===")
    print("If test accounts show 'NO ACTIVE AGENTS', that's the root cause.")
    print("The frontend can send messages, but workspaces without active agents")
    print("cannot process AI responses, causing the endless polling loop.")
    print("\nSOLUTION: Update workspace seeding to give all users active agents.")

if __name__ == "__main__":
    check_workspace_config()