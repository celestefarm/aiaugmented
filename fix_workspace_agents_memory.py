#!/usr/bin/env python3
"""
Fix workspace agent configuration for in-memory database.
This script connects to the running backend's in-memory database and adds active agents to all workspaces.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import get_database

async def fix_workspace_agents():
    """Fix workspace agent configuration by adding active agents to all workspaces"""
    print("🚀 Starting In-Memory Database Workspace Agent Configuration Fix...")
    print("=" * 80)
    
    try:
        # Get the in-memory database instance
        db = get_database()
        if not db:
            print("❌ ERROR: Could not get in-memory database instance")
            print("   Make sure the backend server is running!")
            return False
        
        print("✅ Connected to in-memory database successfully")
        
        # Get workspaces collection
        workspaces_collection = db.workspaces
        
        # Find all workspaces
        workspaces_cursor = workspaces_collection.find({})
        workspaces = await workspaces_cursor.to_list(length=None)
        
        print(f"📊 Found {len(workspaces)} workspaces in database")
        
        if len(workspaces) == 0:
            print("⚠️  No workspaces found in database")
            return True
        
        # Check current workspace configurations
        workspaces_without_agents = []
        workspaces_with_agents = []
        
        for workspace in workspaces:
            workspace_id = workspace.get('_id')
            settings = workspace.get('settings', {})
            active_agents = settings.get('active_agents', [])
            
            print(f"📋 Workspace {workspace_id}:")
            print(f"   - Name: {workspace.get('name', 'Unknown')}")
            print(f"   - Owner: {workspace.get('owner_id', 'Unknown')}")
            print(f"   - Active Agents: {active_agents}")
            
            if not active_agents:
                workspaces_without_agents.append(workspace)
            else:
                workspaces_with_agents.append(workspace)
        
        print(f"\n📈 Summary:")
        print(f"   - Workspaces with active agents: {len(workspaces_with_agents)}")
        print(f"   - Workspaces without active agents: {len(workspaces_without_agents)}")
        
        if len(workspaces_without_agents) == 0:
            print("✅ All workspaces already have active agents configured!")
            return True
        
        print(f"\n🔧 Fixing {len(workspaces_without_agents)} workspaces...")
        
        # Fix workspaces without active agents
        fixed_count = 0
        for workspace in workspaces_without_agents:
            workspace_id = workspace.get('_id')
            
            # Update workspace settings to include active agents
            update_result = await workspaces_collection.update_one(
                {"_id": workspace_id},
                {
                    "$set": {
                        "settings.active_agents": ["strategist"]
                    }
                }
            )
            
            if update_result.modified_count > 0:
                fixed_count += 1
                print(f"✅ Fixed workspace {workspace_id} - added 'strategist' agent")
            else:
                print(f"❌ Failed to fix workspace {workspace_id}")
        
        print(f"\n🎉 WORKSPACE AGENT CONFIGURATION FIX COMPLETED!")
        print(f"   - Fixed {fixed_count} out of {len(workspaces_without_agents)} workspaces")
        
        if fixed_count == len(workspaces_without_agents):
            print("✅ All workspaces now have active agents configured!")
            print("🔄 The endless polling loop should now be resolved.")
            print("💬 Test accounts should now be able to chat with AI agents!")
            return True
        else:
            print(f"⚠️  {len(workspaces_without_agents) - fixed_count} workspaces still need fixing")
            return False
            
    except Exception as e:
        print(f"❌ ERROR: Failed to fix workspace agents: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main function"""
    success = await fix_workspace_agents()
    if success:
        print("\n✅ Fix completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Fix failed - please check the errors above")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())