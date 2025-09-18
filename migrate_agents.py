#!/usr/bin/env python3
"""
Migration script to update existing agents with model_name field
"""
import asyncio
import sys
import os
sys.path.append('backend')

from backend.database import connect_to_mongo, close_mongo_connection, get_database


async def migrate_strategist_agent():
    """Update the existing Strategist agent with model_name"""
    print("🔄 Migrating Strategist Agent with AI Model Configuration")
    print("=" * 60)
    
    # Connect to database
    await connect_to_mongo()
    
    try:
        db = get_database()
        if db is None:
            print("❌ Database connection failed")
            return
            
        agents_collection = db.agents
        
        # Check if Strategist exists
        strategist = await agents_collection.find_one({"agent_id": "strategist"})
        
        if not strategist:
            print("❌ Strategist agent not found in database")
            return
            
        print(f"✅ Found Strategist agent: {strategist.get('name', 'Unknown')}")
        
        # Update with model_name
        update_result = await agents_collection.update_one(
            {"agent_id": "strategist"},
            {
                "$set": {
                    "model_name": "openai/gpt-4"
                }
            }
        )
        
        if update_result.modified_count > 0:
            print("✅ Successfully updated Strategist agent with GPT-4 model")
            
            # Verify the update
            updated_strategist = await agents_collection.find_one({"agent_id": "strategist"})
            print(f"🧠 Model configured: {updated_strategist.get('model_name', 'None')}")
            
        else:
            print("⚠️  No changes made - agent may already be updated")
            
        # Also update all other agents to have model_name: null for consistency
        print("\n🔄 Updating other agents for consistency...")
        other_agents_result = await agents_collection.update_many(
            {
                "agent_id": {"$ne": "strategist"},
                "model_name": {"$exists": False}
            },
            {
                "$set": {
                    "model_name": None
                }
            }
        )
        
        print(f"✅ Updated {other_agents_result.modified_count} other agents")
        
        # List all agents with their model configuration
        print(f"\n📋 Current Agent Configuration:")
        agents_cursor = agents_collection.find({})
        async for agent in agents_cursor:
            model_status = agent.get('model_name', 'None')
            ai_ready = "🤖" if model_status else "📝"
            print(f"   {ai_ready} {agent.get('name', 'Unknown')} - Model: {model_status}")
            
        print(f"\n🎉 Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(migrate_strategist_agent())