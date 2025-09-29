#!/usr/bin/env python3
"""
Direct MongoDB Workspace Agent Configuration Fix

This script connects directly to the MongoDB database used by the backend
to fix workspace agent configuration for ALL users.
"""

import asyncio
import sys
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

# MongoDB connection settings (matching backend configuration)
MONGODB_URL = "mongodb://localhost:27017"
DATABASE_NAME = "wild_beaver_climb"

async def fix_workspace_agents_direct():
    """Fix all workspaces to have active agents configured - direct MongoDB connection"""
    print("🔧 DIRECT MONGODB WORKSPACE AGENT CONFIGURATION FIX")
    print("=" * 60)
    
    # Connect directly to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    workspaces_collection = db.workspaces
    users_collection = db.users
    
    try:
        # Get all workspaces and users
        workspaces = await workspaces_collection.find({}).to_list(length=None)
        users = await users_collection.find({}).to_list(length=None)
        
        print(f"📊 Found {len(workspaces)} workspaces and {len(users)} users")
        
        if len(workspaces) == 0:
            print("❌ ERROR: No workspaces found in database")
            print("   This suggests the database connection or data is missing")
            return False
        
        # Create user email lookup
        user_lookup = {str(user["_id"]): user["email"] for user in users}
        
        # Default active agents configuration for ALL users
        default_active_agents = ["strategist"]
        
        fixed_count = 0
        already_configured_count = 0
        
        for workspace in workspaces:
            workspace_id = str(workspace["_id"])
            owner_id = workspace.get("owner_id")
            owner_email = user_lookup.get(owner_id, "Unknown")
            title = workspace.get("title", "Untitled")
            
            # Check current active agents
            current_settings = workspace.get("settings", {})
            current_active_agents = current_settings.get("active_agents", [])
            
            print(f"\n📋 Workspace: '{title}' (Owner: {owner_email})")
            print(f"   Current active agents: {current_active_agents}")
            
            if not current_active_agents:
                # Fix workspace - add active agents
                updated_settings = current_settings.copy()
                updated_settings["active_agents"] = default_active_agents
                
                # Update workspace
                await workspaces_collection.update_one(
                    {"_id": workspace["_id"]},
                    {
                        "$set": {
                            "settings": updated_settings,
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                
                print(f"   ✅ FIXED: Added active agents: {default_active_agents}")
                fixed_count += 1
            else:
                print(f"   ✓ Already configured with agents: {current_active_agents}")
                already_configured_count += 1
        
        print(f"\n🎯 SUMMARY:")
        print(f"   ✅ Fixed workspaces: {fixed_count}")
        print(f"   ✓ Already configured: {already_configured_count}")
        print(f"   📊 Total workspaces: {len(workspaces)}")
        
        if fixed_count > 0:
            print(f"\n🚀 SUCCESS: All users now have AI agent access!")
            print(f"   Test accounts can now chat with AI agents")
            print(f"   Regular accounts maintain their existing functionality")
            print(f"   The endless polling loop should be resolved")
        else:
            print(f"\n✓ All workspaces already properly configured")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to fix workspace agents: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        client.close()


async def verify_fix_direct():
    """Verify that all workspaces now have active agents - direct MongoDB connection"""
    print(f"\n🔍 VERIFICATION:")
    print("=" * 30)
    
    # Connect directly to MongoDB
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    
    workspaces_collection = db.workspaces
    users_collection = db.users
    
    try:
        workspaces = await workspaces_collection.find({}).to_list(length=None)
        users = await users_collection.find({}).to_list(length=None)
        
        user_lookup = {str(user["_id"]): user["email"] for user in users}
        
        workspaces_without_agents = 0
        workspaces_with_agents = 0
        
        for workspace in workspaces:
            owner_id = workspace.get("owner_id")
            owner_email = user_lookup.get(owner_id, "Unknown")
            title = workspace.get("title", "Untitled")
            
            current_settings = workspace.get("settings", {})
            current_active_agents = current_settings.get("active_agents", [])
            
            if current_active_agents:
                workspaces_with_agents += 1
                print(f"   ✅ {owner_email}: '{title}' → {current_active_agents}")
            else:
                workspaces_without_agents += 1
                print(f"   ❌ {owner_email}: '{title}' → NO AGENTS")
        
        print(f"\n📊 VERIFICATION RESULTS:")
        print(f"   ✅ Workspaces with agents: {workspaces_with_agents}")
        print(f"   ❌ Workspaces without agents: {workspaces_without_agents}")
        
        if workspaces_without_agents == 0:
            print(f"   🎉 SUCCESS: All workspaces have active agents!")
            return True
        else:
            print(f"   ⚠️  WARNING: {workspaces_without_agents} workspaces still need fixing")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: Verification failed: {e}")
        return False
    finally:
        client.close()


async def main():
    """Main execution function"""
    print("🚀 Starting Direct MongoDB Workspace Agent Configuration Fix...")
    
    try:
        # Fix workspace agents
        success = await fix_workspace_agents_direct()
        
        if success:
            # Verify the fix
            await verify_fix_direct()
            
            print(f"\n🎯 NEXT STEPS:")
            print(f"   1. Test accounts can now send messages and receive AI responses")
            print(f"   2. The endless polling loop should be resolved")
            print(f"   3. All users have equal AI agent access regardless of email type")
            print(f"\n✅ Fix completed successfully!")
        else:
            print(f"\n❌ Fix failed - please check the errors above")
            
    except Exception as e:
        print(f"❌ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())