#!/usr/bin/env python3

import asyncio
import aiohttp
import json
import sys

BASE_URL = "http://localhost:8000"

async def test_signup_and_chat():
    """Test complete signup and chat functionality for test accounts"""
    print("🚀 Testing Complete AI Chat Functionality")
    print("=" * 50)
    
    async with aiohttp.ClientSession() as session:
        try:
            # Test 1: Sign up with a test email
            print("\n📝 Step 1: Testing signup with test email...")
            signup_data = {
                "email": "testuser@testing.com",
                "name": "Test User",
                "password": "testpass123"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/auth/signup", json=signup_data) as response:
                if response.status == 201:
                    signup_result = await response.json()
                    access_token = signup_result.get("access_token")
                    user_info = signup_result.get("user")
                    print(f"✅ Signup successful! User ID: {user_info.get('id')}")
                    print(f"   Email: {user_info.get('email')}")
                    print(f"   Name: {user_info.get('name')}")
                else:
                    print(f"❌ Signup failed with status {response.status}")
                    error_text = await response.text()
                    print(f"   Error: {error_text}")
                    return False
            
            # Test 2: Get workspaces for the new user
            print("\n🏢 Step 2: Getting user workspaces...")
            headers = {"Authorization": f"Bearer {access_token}"}
            
            async with session.get(f"{BASE_URL}/api/v1/workspaces", headers=headers) as response:
                if response.status == 200:
                    workspaces = await response.json()
                    print(f"✅ Found {len(workspaces)} workspaces")
                    
                    if not workspaces:
                        print("⚠️  No workspaces found - creating one...")
                        # Create a workspace
                        workspace_data = {
                            "title": "Test Chat Workspace",
                            "settings": {
                                "active_agents": ["strategist"],
                                "theme": "dark",
                                "auto_save": True
                            }
                        }
                        
                        async with session.post(f"{BASE_URL}/api/v1/workspaces", 
                                              json=workspace_data, headers=headers) as create_response:
                            if create_response.status == 201:
                                new_workspace = await create_response.json()
                                workspaces = [new_workspace]
                                print(f"✅ Created workspace: {new_workspace.get('id')}")
                            else:
                                print(f"❌ Failed to create workspace: {create_response.status}")
                                return False
                    
                    # Check workspace configuration
                    workspace = workspaces[0]
                    workspace_id = workspace.get("id")
                    settings = workspace.get("settings", {})
                    active_agents = settings.get("active_agents", [])
                    
                    print(f"   Workspace ID: {workspace_id}")
                    print(f"   Title: {workspace.get('title')}")
                    print(f"   Active Agents: {active_agents}")
                    
                    if not active_agents:
                        print("❌ CRITICAL: Workspace has no active agents!")
                        return False
                    else:
                        print(f"✅ Workspace has {len(active_agents)} active agent(s)")
                        
                else:
                    print(f"❌ Failed to get workspaces: {response.status}")
                    return False
            
            # Test 3: Send a message and check for AI response
            print("\n💬 Step 3: Testing AI chat functionality...")
            
            message_data = {
                "content": "Hello! Can you help me create a strategic plan for my business?",
                "type": "human"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/workspaces/{workspace_id}/messages", 
                                  json=message_data, headers=headers) as response:
                if response.status == 200:
                    print("✅ Message sent successfully!")
                    
                    # The response should be a streaming response with AI content
                    response_text = await response.text()
                    
                    if response_text and len(response_text) > 50:
                        print(f"✅ Received AI response ({len(response_text)} characters)")
                        print(f"   Preview: {response_text[:100]}...")
                        
                        # Test 4: Check if message was saved
                        print("\n📋 Step 4: Verifying messages were saved...")
                        async with session.get(f"{BASE_URL}/api/v1/workspaces/{workspace_id}/messages", 
                                             headers=headers) as msg_response:
                            if msg_response.status == 200:
                                messages = await msg_response.json()
                                print(f"✅ Found {len(messages)} messages in workspace")
                                
                                human_messages = [m for m in messages if m.get("type") == "human"]
                                ai_messages = [m for m in messages if m.get("type") == "ai"]
                                
                                print(f"   Human messages: {len(human_messages)}")
                                print(f"   AI messages: {len(ai_messages)}")
                                
                                if len(human_messages) >= 1 and len(ai_messages) >= 1:
                                    print("🎉 SUCCESS: Complete AI chat functionality is working!")
                                    return True
                                else:
                                    print("❌ FAILURE: Messages not properly saved")
                                    return False
                            else:
                                print(f"❌ Failed to retrieve messages: {msg_response.status}")
                                return False
                    else:
                        print("❌ FAILURE: No meaningful AI response received")
                        print(f"   Response: {response_text}")
                        return False
                else:
                    print(f"❌ Failed to send message: {response.status}")
                    error_text = await response.text()
                    print(f"   Error: {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Test failed with exception: {e}")
            import traceback
            traceback.print_exc()
            return False

async def test_existing_test_account():
    """Test with an existing test account to see if it can chat"""
    print("\n🔄 Testing with existing test account...")
    
    async with aiohttp.ClientSession() as session:
        try:
            # Try to login with existing test account
            login_data = {
                "email": "test@example.com",
                "password": "password123"
            }
            
            async with session.post(f"{BASE_URL}/api/v1/auth/login", json=login_data) as response:
                if response.status == 200:
                    login_result = await response.json()
                    access_token = login_result.get("access_token")
                    print("✅ Login successful with existing test account")
                    
                    # Get workspaces
                    headers = {"Authorization": f"Bearer {access_token}"}
                    async with session.get(f"{BASE_URL}/api/v1/workspaces", headers=headers) as ws_response:
                        if ws_response.status == 200:
                            workspaces = await ws_response.json()
                            print(f"✅ Found {len(workspaces)} workspaces for existing test account")
                            
                            if workspaces:
                                workspace = workspaces[0]
                                active_agents = workspace.get("settings", {}).get("active_agents", [])
                                print(f"   Active agents: {active_agents}")
                                
                                if active_agents:
                                    print("✅ Existing test account has workspaces with active agents!")
                                    return True
                                else:
                                    print("❌ Existing test account workspaces missing active agents")
                                    return False
                            else:
                                print("⚠️  No workspaces found for existing test account")
                                return False
                        else:
                            print(f"❌ Failed to get workspaces: {ws_response.status}")
                            return False
                else:
                    print(f"⚠️  Could not login with existing test account (status: {response.status})")
                    return False
                    
        except Exception as e:
            print(f"❌ Test with existing account failed: {e}")
            return False

async def main():
    print("🧪 COMPREHENSIVE AI CHAT FUNCTIONALITY TEST")
    print("=" * 60)
    
    # Test 1: New test account
    new_account_test = await test_signup_and_chat()
    
    # Test 2: Existing test account
    existing_account_test = await test_existing_test_account()
    
    print("\n" + "=" * 60)
    print("📊 FINAL TEST RESULTS:")
    print(f"   New test account chat: {'✅ PASS' if new_account_test else '❌ FAIL'}")
    print(f"   Existing test account: {'✅ PASS' if existing_account_test else '❌ FAIL'}")
    
    if new_account_test:
        print("\n🎉 SUCCESS: AI chat functionality is working for test accounts!")
        print("   ✅ Test accounts can sign up")
        print("   ✅ Workspaces are created with active agents")
        print("   ✅ AI responses are generated and saved")
        print("   ✅ Complete chat flow is functional")
        return True
    else:
        print("\n❌ FAILURE: AI chat functionality still has issues")
        return False

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)