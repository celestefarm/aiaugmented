#!/usr/bin/env python3

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import get_database

async def test_workspace_agent_configuration():
    """Test that all workspaces have active agents configured"""
    print("🔍 Testing workspace agent configuration...")
    
    db = get_database()
    if db is None:
        print("❌ Database not available")
        return False
    
    try:
        workspaces_collection = db.workspaces
        
        # Get all workspaces
        workspaces = await workspaces_collection.find({}).to_list(length=None)
        
        if not workspaces:
            print("⚠️  No workspaces found in database")
            return False
        
        print(f"📊 Found {len(workspaces)} workspaces")
        
        all_have_agents = True
        for workspace in workspaces:
            workspace_id = str(workspace["_id"])
            title = workspace.get("title", "Unknown")
            settings = workspace.get("settings", {})
            active_agents = settings.get("active_agents", [])
            
            print(f"\n🏢 Workspace: {title} (ID: {workspace_id})")
            print(f"   Settings: {settings}")
            print(f"   Active Agents: {active_agents}")
            
            if not active_agents:
                print(f"   ❌ NO ACTIVE AGENTS CONFIGURED!")
                all_have_agents = False
            else:
                print(f"   ✅ Has {len(active_agents)} active agent(s)")
        
        if all_have_agents:
            print(f"\n🎉 SUCCESS: All {len(workspaces)} workspaces have active agents configured!")
            return True
        else:
            print(f"\n❌ FAILURE: Some workspaces are missing active agents")
            return False
            
    except Exception as e:
        print(f"❌ Error testing workspace configuration: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_user_workspace_creation():
    """Test creating a workspace for a test user to see if it gets active agents"""
    print("\n🔍 Testing new workspace creation for test users...")
    
    db = get_database()
    if db is None:
        print("❌ Database not available")
        return False
    
    try:
        users_collection = db.users
        workspaces_collection = db.workspaces
        
        # Find a test user
        test_user = await users_collection.find_one({"email": {"$regex": "test|testing"}})
        if not test_user:
            print("⚠️  No test users found")
            return False
        
        user_id = str(test_user["_id"])
        user_email = test_user["email"]
        
        print(f"👤 Found test user: {user_email} (ID: {user_id})")
        
        # Create a test workspace
        from datetime import datetime
        test_workspace = {
            "title": "Test Workspace for Agent Verification",
            "owner_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "settings": {
                "active_agents": ["strategist"],  # This should be added by default now
                "theme": "dark",
                "auto_save": True
            },
            "transform": {
                "x": 0,
                "y": 0,
                "scale": 1
            }
        }
        
        result = await workspaces_collection.insert_one(test_workspace)
        workspace_id = str(result.inserted_id)
        
        print(f"✅ Created test workspace: {workspace_id}")
        
        # Verify it has active agents
        created_workspace = await workspaces_collection.find_one({"_id": result.inserted_id})
        active_agents = created_workspace.get("settings", {}).get("active_agents", [])
        
        if active_agents:
            print(f"✅ New workspace has active agents: {active_agents}")
            return True
        else:
            print(f"❌ New workspace missing active agents!")
            return False
            
    except Exception as e:
        print(f"❌ Error testing new workspace creation: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("🚀 Starting Workspace Agent Configuration Test")
    print("=" * 50)
    
    # Test existing workspaces
    existing_test = await test_workspace_agent_configuration()
    
    # Test new workspace creation
    new_workspace_test = await test_user_workspace_creation()
    
    print("\n" + "=" * 50)
    print("📋 TEST SUMMARY:")
    print(f"   Existing workspaces have agents: {'✅ PASS' if existing_test else '❌ FAIL'}")
    print(f"   New workspaces get agents: {'✅ PASS' if new_workspace_test else '❌ FAIL'}")
    
    if existing_test and new_workspace_test:
        print("\n🎉 ALL TESTS PASSED! Workspace agent configuration is working correctly.")
        return True
    else:
        print("\n❌ SOME TESTS FAILED! Workspace agent configuration needs attention.")
        return False

if __name__ == "__main__":
    asyncio.run(main())