#!/usr/bin/env python3

import asyncio
import aiohttp
import json

BASE_URL = "http://localhost:8000"

async def test_new_user_workspace_agents():
    """Test that new users get workspaces with active agents"""
    print("🧪 Testing New User Workspace Agent Configuration")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Step 1: Create a new test user
            print("\n📝 Step 1: Creating new test user...")
            signup_data = {
                "email": f"testuser{asyncio.get_event_loop().time()}@testing.com",
                "name": "Test User Agent Check",
                "password": "testpass123"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/auth/signup", json=signup_data) as response:
                if response.status != 201:
                    print(f"❌ Signup failed: {response.status}")
                    return False
                
                result = await response.json()
                access_token = result.get("access_token")
                user_info = result.get("user")
                print(f"✅ User created: {user_info.get('email')}")
            
            # Step 2: Create a workspace for this user
            print("\n🏢 Step 2: Creating workspace...")
            headers = {"Authorization": f"Bearer {access_token}"}
            workspace_data = {
                "title": "Agent Test Workspace",
                "settings": {
                    "theme": "dark",
                    "auto_save": True
                }
            }
            
            async with session.post(f"{BASE_URL}/api/v1/workspaces", 
                                  json=workspace_data, headers=headers) as response:
                if response.status != 201:
                    print(f"❌ Workspace creation failed: {response.status}")
                    error_text = await response.text()
                    print(f"   Error: {error_text}")
                    return False
                
                workspace = await response.json()
                workspace_id = workspace.get("id")
                settings = workspace.get("settings", {})
                active_agents = settings.get("active_agents", [])
                
                print(f"✅ Workspace created: {workspace_id}")
                print(f"   Title: {workspace.get('title')}")
                print(f"   Settings: {settings}")
                print(f"   Active Agents: {active_agents}")
                
                if active_agents:
                    print(f"🎉 SUCCESS: New workspace has {len(active_agents)} active agent(s)!")
                    
                    # Step 3: Test sending a message
                    print("\n💬 Step 3: Testing message sending...")
                    message_data = {
                        "content": "Hello, can you help me with strategic planning?",
                        "type": "human"
                    }
                    
                    async with session.post(f"{BASE_URL}/api/v1/workspaces/{workspace_id}/messages", 
                                          json=message_data, headers=headers) as msg_response:
                        if msg_response.status == 200:
                            response_text = await msg_response.text()
                            if response_text and len(response_text) > 20:
                                print(f"✅ AI response received ({len(response_text)} chars)")
                                print(f"   Preview: {response_text[:100]}...")
                                return True
                            else:
                                print(f"❌ No meaningful AI response: {response_text}")
                                return False
                        else:
                            print(f"❌ Message sending failed: {msg_response.status}")
                            error_text = await msg_response.text()
                            print(f"   Error: {error_text}")
                            return False
                else:
                    print("❌ FAILURE: New workspace has NO active agents!")
                    return False
                    
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            return False

async def test_celeste_account():
    """Test with the known working Celeste account"""
    print("\n🔄 Testing with Celeste account (known working)...")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Try to login with Celeste account
            login_data = {
                "email": "celeste.fcp@gmail.com",
                "password": "password123"  # Default password from seeding
            }
            
            async with session.post(f"{BASE_URL}/api/v1/auth/login", json=login_data) as response:
                if response.status == 200:
                    result = await response.json()
                    access_token = result.get("access_token")
                    print("✅ Celeste login successful")
                    
                    # Get workspaces
                    headers = {"Authorization": f"Bearer {access_token}"}
                    async with session.get(f"{BASE_URL}/api/v1/workspaces", headers=headers) as ws_response:
                        if ws_response.status == 200:
                            workspaces = await ws_response.json()
                            print(f"✅ Celeste has {len(workspaces)} workspaces")
                            
                            if workspaces:
                                workspace = workspaces[0]
                                active_agents = workspace.get("settings", {}).get("active_agents", [])
                                print(f"   Active agents: {active_agents}")
                                
                                if active_agents:
                                    print("✅ Celeste's workspaces have active agents (as expected)")
                                    return True
                                else:
                                    print("❌ Even Celeste's workspaces missing active agents!")
                                    return False
                            else:
                                print("⚠️  Celeste has no workspaces")
                                return False
                        else:
                            print(f"❌ Failed to get Celeste's workspaces: {ws_response.status}")
                            return False
                else:
                    print(f"❌ Celeste login failed: {response.status}")
                    return False
                    
        except Exception as e:
            print(f"❌ Celeste test failed: {e}")
            return False

async def main():
    print("🚀 WORKSPACE AGENT CONFIGURATION TEST")
    print("=" * 60)
    
    # Test 1: New user workspace creation
    new_user_test = await test_new_user_workspace_agents()
    
    # Test 2: Known working account
    celeste_test = await test_celeste_account()
    
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS:")
    print(f"   New user workspace agents: {'✅ PASS' if new_user_test else '❌ FAIL'}")
    print(f"   Celeste account (control): {'✅ PASS' if celeste_test else '❌ FAIL'}")
    
    if new_user_test:
        print("\n🎉 SUCCESS: Workspace agent configuration is working!")
        print("   ✅ New workspaces get active agents automatically")
        print("   ✅ AI chat functionality works for all users")
        return True
    else:
        print("\n❌ FAILURE: Workspace agent configuration still needs fixing")
        if celeste_test:
            print("   ℹ️  Celeste account works, so the issue is with new workspace creation")
        else:
            print("   ⚠️  Even Celeste account has issues - broader problem")
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    exit(0 if result else 1)