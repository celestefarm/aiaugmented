#!/usr/bin/env python3

import asyncio
from database_memory import get_database, connect_to_mongo, close_mongo_connection

async def check_workspace_agent_configuration():
    """Check workspace and agent configuration for different users"""
    
    await connect_to_mongo()
    db = get_database()
    
    if not db:
        print("❌ Database not available")
        return
    
    print("🔍 WORKSPACE AGENT CONFIGURATION ANALYSIS")
    print("=" * 60)
    
    # Get all users
    users = await db.users.find({}).to_list(length=None)
    print(f"\n📊 Found {len(users)} users:")
    
    for user in users:
        email = user.get('email')
        user_id = str(user.get('_id'))
        print(f"\n👤 User: {email} (ID: {user_id})")
        
        # Get workspaces for this user
        workspaces = await db.workspaces.find({"owner_id": user_id}).to_list(length=None)
        print(f"   📁 Workspaces: {len(workspaces)}")
        
        for workspace in workspaces:
            workspace_id = str(workspace.get('_id'))
            title = workspace.get('title', 'Untitled')
            settings = workspace.get('settings', {})
            active_agents = settings.get('active_agents', [])
            
            print(f"      🏢 '{title}' (ID: {workspace_id})")
            print(f"         🤖 Active Agents: {active_agents}")
            print(f"         ⚙️  Settings: {settings}")
            
            # Check messages in this workspace
            messages = await db.messages.find({"workspace_id": workspace_id}).to_list(length=None)
            print(f"         💬 Messages: {len(messages)}")
    
    # Check available agents
    print(f"\n🤖 AVAILABLE AGENTS:")
    agents = await db.agents.find({}).to_list(length=None)
    print(f"   Total agents: {len(agents)}")
    
    for agent in agents:
        agent_id = agent.get('agent_id')
        name = agent.get('name')
        is_active = agent.get('is_active', False)
        print(f"      - {agent_id}: {name} (Active: {is_active})")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(check_workspace_agent_configuration())