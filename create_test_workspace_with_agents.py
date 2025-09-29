#!/usr/bin/env python3
"""
Create a test workspace with active agents for the test user to enable chat functionality.
This ensures that any user (testing email or regular account) can access AI agent features.
"""

import asyncio
from datetime import datetime
from bson import ObjectId
from backend.database import get_database
from backend.utils.seed_users import get_default_agents

async def create_test_workspace_with_agents():
    """Create a workspace with active agents for the test user."""
    
    print("🚀 Creating test workspace with active agents...")
    
    # Get database connection
    db = await get_database()
    
    # Find the test user
    test_user = await db.users.find_one({"email": "test@example.com"})
    if not test_user:
        print("❌ Test user not found. Please run database seeding first.")
        return
    
    user_id = str(test_user["_id"])
    print(f"✅ Found test user: {test_user['email']} (ID: {user_id})")
    
    # Check if user already has workspaces
    existing_workspaces = await db.workspaces.find({"owner_id": user_id}).to_list(None)
    if existing_workspaces:
        print(f"✅ User already has {len(existing_workspaces)} workspace(s)")
        for ws in existing_workspaces:
            print(f"   - Workspace: {ws['_id']} - {ws['name']}")
        return
    
    # Create a new workspace for the test user
    workspace_data = {
        "_id": ObjectId(),
        "name": "AI Agent Test Workspace",
        "description": "Test workspace with active AI agents for chat functionality",
        "owner_id": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "is_active": True
    }
    
    result = await db.workspaces.insert_one(workspace_data)
    workspace_id = str(workspace_data["_id"])
    print(f"✅ Created workspace: {workspace_id}")
    
    # Get default agents
    default_agents = get_default_agents()
    
    # Insert agents into database
    agents_inserted = 0
    for agent_data in default_agents:
        # Check if agent already exists
        existing_agent = await db.agents.find_one({"name": agent_data["name"]})
        if not existing_agent:
            agent_data["_id"] = ObjectId()
            agent_data["created_at"] = datetime.utcnow()
            agent_data["updated_at"] = datetime.utcnow()
            await db.agents.insert_one(agent_data)
            agents_inserted += 1
            print(f"✅ Created agent: {agent_data['name']}")
        else:
            print(f"✅ Agent already exists: {agent_data['name']}")
    
    print(f"✅ Agents ready: {agents_inserted} new, {len(default_agents) - agents_inserted} existing")
    
    # Create some sample messages to demonstrate chat functionality
    sample_messages = [
        {
            "_id": ObjectId(),
            "workspace_id": workspace_id,
            "content": "Hello! I'd like to test the AI agent chat functionality.",
            "type": "human",
            "author": test_user["name"],
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "added_to_map": False
        },
        {
            "_id": ObjectId(),
            "workspace_id": workspace_id,
            "content": "Hello! I'm your Strategic Co-Pilot AI agent. I'm ready to help you with strategic thinking, analysis, and problem-solving. What would you like to explore today?",
            "type": "ai",
            "author": "Strategic Co-Pilot",
            "agent_id": "strategist",
            "created_at": datetime.utcnow(),
            "added_to_map": False
        }
    ]
    
    # Insert sample messages
    for message in sample_messages:
        await db.messages.insert_one(message)
    
    print(f"✅ Created {len(sample_messages)} sample messages")
    
    print("\n🎉 Test workspace setup complete!")
    print(f"   - Workspace ID: {workspace_id}")
    print(f"   - User: {test_user['email']}")
    print(f"   - Agents: {len(default_agents)} available")
    print(f"   - Messages: {len(sample_messages)} sample messages")
    print("\n✅ The test user can now access AI agent chat functionality!")

if __name__ == "__main__":
    asyncio.run(create_test_workspace_with_agents())