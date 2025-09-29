#!/usr/bin/env python3
"""
Universal Workspace Agent Configuration Fix

This script ensures ALL users have workspaces with active agents configured,
regardless of their email address. This fixes the AI chat functionality
for test accounts and any other users.

Root Cause: The seeding system only created workspaces with active agents
for specific email addresses (celeste.fcp@gmail.com), leaving test accounts
with empty active_agents arrays, causing endless polling loops.

Solution: Update ALL existing workspaces to have active agents configured.
"""

import asyncio
import sys
import os
from datetime import datetime

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import get_database, connect_to_mongo, close_mongo_connection


async def fix_workspace_agents():
    """Fix all workspaces to have active agents configured"""
    print("🔧 UNIVERSAL WORKSPACE AGENT CONFIGURATION FIX")
    print("=" * 60)
    
    db = get_database()
    if db is None:
        print("❌ ERROR: Database not available")
        return False
    
    workspaces_collection = db.workspaces
    users_collection = db.users
    
    try:
        # Get all workspaces
        workspaces = await workspaces_collection.find({}).to_list(length=None)
        users = await users_collection.find({}).to_list(length=None)
        
        print(f"📊 Found {len(workspaces)} workspaces and {len(users)} users")
        
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
        else:
            print(f"\n✓ All workspaces already properly configured")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to fix workspace agents: {e}")
        import traceback
        traceback.print_exc()
        return False


async def verify_fix():
    """Verify that all workspaces now have active agents"""
    print(f"\n🔍 VERIFICATION:")
    print("=" * 30)
    
    db = get_database()
    if db is None:
        print("❌ ERROR: Database not available for verification")
        return False
    
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


async def main():
    """Main execution function"""
    print("🚀 Starting Universal Workspace Agent Configuration Fix...")
    
    # Connect to database
    await connect_to_mongo()
    
    try:
        # Fix workspace agents
        success = await fix_workspace_agents()
        
        if success:
            # Verify the fix
            await verify_fix()
            
            print(f"\n🎯 NEXT STEPS:")
            print(f"   1. Test accounts can now send messages and receive AI responses")
            print(f"   2. The endless polling loop should be resolved")
            print(f"   3. All users have equal AI agent access regardless of email type")
            print(f"\n✅ Fix completed successfully!")
        else:
            print(f"\n❌ Fix failed - please check the errors above")
            
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(main())