import asyncio
import aiohttp
import json

async def test_user_name_fix():
    """Test that the user name fix is working correctly"""
    
    # Login to get access token
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    async with aiohttp.ClientSession() as session:
        # Login
        async with session.post(
            "http://localhost:8000/api/v1/auth/login",
            json=login_data
        ) as response:
            if response.status == 200:
                login_result = await response.json()
                access_token = login_result["access_token"]
                user_info = login_result["user"]
                
                print("✅ Login successful!")
                print(f"User name: '{user_info['name']}'")
                print(f"User email: {user_info['email']}")
                
                # Get workspaces to check messages
                headers = {"Authorization": f"Bearer {access_token}"}
                async with session.get(
                    "http://localhost:8000/api/v1/workspaces",
                    headers=headers
                ) as ws_response:
                    if ws_response.status == 200:
                        workspaces = await ws_response.json()
                        if workspaces["workspaces"]:
                            workspace_id = workspaces["workspaces"][0]["id"]
                            print(f"✅ Found workspace: {workspace_id}")
                            
                            # Get messages to check author names
                            async with session.get(
                                f"http://localhost:8000/api/v1/workspaces/{workspace_id}/messages",
                                headers=headers
                            ) as msg_response:
                                if msg_response.status == 200:
                                    messages = await msg_response.json()
                                    print(f"✅ Found {len(messages['messages'])} messages")
                                    
                                    for msg in messages["messages"]:
                                        if msg["type"] == "human":
                                            print(f"Human message author: '{msg['author']}'")
                                            if msg["author"] == "Celeste Farm":
                                                print("✅ SUCCESS: User name is correctly set to 'Celeste Farm'!")
                                            else:
                                                print(f"❌ ISSUE: Expected 'Celeste Farm', got '{msg['author']}'")
                                else:
                                    print(f"❌ Failed to get messages: {msg_response.status}")
                        else:
                            print("❌ No workspaces found")
                    else:
                        print(f"❌ Failed to get workspaces: {ws_response.status}")
            else:
                print(f"❌ Login failed: {response.status}")
                error_text = await response.text()
                print(f"Error: {error_text}")

if __name__ == "__main__":
    asyncio.run(test_user_name_fix())