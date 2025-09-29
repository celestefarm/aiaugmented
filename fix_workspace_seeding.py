#!/usr/bin/env python3
"""
Fix workspace seeding logic to ensure all workspaces get active agents.
This script modifies the seed_workspaces.py file to create workspaces with active agents for all users.
"""

import os
import sys

def fix_workspace_seeding():
    """Fix the workspace seeding logic to include active agents for all users"""
    print("🚀 Starting Workspace Seeding Logic Fix...")
    print("=" * 80)
    
    try:
        # Path to the seed_workspaces.py file
        seed_file_path = os.path.join("backend", "utils", "seed_workspaces.py")
        
        if not os.path.exists(seed_file_path):
            print(f"❌ ERROR: Could not find {seed_file_path}")
            return False
        
        print(f"📁 Found seed file: {seed_file_path}")
        
        # Read the current content
        with open(seed_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        print("📖 Read current seed file content")
        
        # Check if the file contains the problematic logic
        if '"active_agents": ["strategist"]' not in content:
            print("⚠️  File doesn't contain the expected active_agents configuration")
            print("🔍 Let's examine what's in the file...")
            print("=" * 40)
            print(content[:500] + "..." if len(content) > 500 else content)
            print("=" * 40)
            return False
        
        # Find the DEFAULT_WORKSPACES section and modify it
        lines = content.split('\n')
        modified_lines = []
        in_default_workspaces = False
        in_celeste_workspace = False
        
        for line in lines:
            if 'DEFAULT_WORKSPACES = {' in line:
                in_default_workspaces = True
                modified_lines.append(line)
                continue
            
            if in_default_workspaces and line.strip() == '}':
                in_default_workspaces = False
                modified_lines.append(line)
                continue
            
            if in_default_workspaces and '"celeste.fcp@gmail.com"' in line:
                in_celeste_workspace = True
                modified_lines.append(line)
                continue
            
            if in_celeste_workspace and '"active_agents": ["strategist"]' in line:
                # This is the line we want to modify - we'll add a comment and create a universal version
                modified_lines.append('            # "active_agents": ["strategist"]  # OLD: Only for specific user')
                modified_lines.append('            "active_agents": ["strategist"]  # NEW: For all users')
                in_celeste_workspace = False
                continue
            
            modified_lines.append(line)
        
        # Now we need to modify the seeding logic to apply active agents to ALL workspaces
        # Look for the seeding function and modify it
        final_content = '\n'.join(modified_lines)
        
        # Add a function to ensure all workspaces have active agents
        additional_code = '''

async def ensure_all_workspaces_have_agents(db):
    """Ensure all existing workspaces have active agents configured"""
    try:
        workspaces_collection = db.workspaces
        
        # Find all workspaces without active agents
        workspaces_cursor = workspaces_collection.find({})
        workspaces = await workspaces_cursor.to_list(length=None)
        
        fixed_count = 0
        for workspace in workspaces:
            settings = workspace.get('settings', {})
            active_agents = settings.get('active_agents', [])
            
            if not active_agents:
                # Add active agents to this workspace
                await workspaces_collection.update_one(
                    {"_id": workspace["_id"]},
                    {
                        "$set": {
                            "settings.active_agents": ["strategist"]
                        }
                    }
                )
                fixed_count += 1
                print(f"✅ Added active agents to workspace {workspace['_id']}")
        
        if fixed_count > 0:
            print(f"🎉 Fixed {fixed_count} workspaces to have active agents!")
        else:
            print("✅ All workspaces already have active agents configured")
            
    except Exception as e:
        print(f"❌ Error ensuring workspaces have agents: {e}")
'''
        
        # Insert the new function before the last line
        final_content += additional_code
        
        # Also modify the seed_default_workspaces function to call our new function
        if 'async def seed_default_workspaces(' in final_content:
            # Add a call to our new function at the end of seed_default_workspaces
            final_content = final_content.replace(
                'print("Default workspaces seeded successfully")',
                '''print("Default workspaces seeded successfully")
    
    # Ensure all workspaces have active agents
    await ensure_all_workspaces_have_agents(db)'''
            )
        
        # Write the modified content back
        with open(seed_file_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
        
        print("✅ Successfully modified workspace seeding logic!")
        print("🔄 The fix will take effect when the backend server is restarted")
        print("💡 All new and existing workspaces will now have active agents")
        
        return True
        
    except Exception as e:
        print(f"❌ ERROR: Failed to fix workspace seeding: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    success = fix_workspace_seeding()
    if success:
        print("\n✅ Workspace seeding fix completed successfully!")
        print("🔄 Please restart the backend server to apply the changes")
        sys.exit(0)
    else:
        print("\n❌ Fix failed - please check the errors above")
        sys.exit(1)

if __name__ == "__main__":
    main()