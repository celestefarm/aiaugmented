import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import sys
import os

# Add the backend directory to the path so we can import modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.utils.seed_agents import seed_agents

async def migrate_agents():
    """Clear existing agents and reseed with new agent names"""
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.wild_beaver_climb
    
    try:
        # Clear existing agents
        print("🗑️  Clearing existing agents...")
        result = await db.agents.delete_many({})
        print(f"✅ Deleted {result.deleted_count} existing agents")
        
        # Reseed with new agents
        print("🌱 Seeding new agents...")
        success = await seed_agents()
        
        if success:
            print("✅ Successfully migrated agents with new names!")
            
            # Verify the new agents
            print("\n📋 New agents in database:")
            async for agent in db.agents.find({}, {'agent_id': 1, 'name': 1}):
                print(f"  - ID: {agent['agent_id']}, Name: {agent['name']}")
        else:
            print("❌ Failed to seed new agents")
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(migrate_agents())