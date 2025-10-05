import asyncio
from database import connect_to_mongo, close_mongo_connection, get_database

async def update_all_agents_to_claude():
    await connect_to_mongo()
    db = get_database()
    
    if db is None:
        print("❌ Database not available")
        return False
    
    try:
        result = await db.agents.update_many(
            {},
            {"$set": {"model_name": "claude-3-5-sonnet"}}
        )
        
        print(f"✅ Updated {result.modified_count} agent(s) to use Claude 3.5 Sonnet")
        
        agents = await db.agents.find({}).to_list(length=None)
        print("\n📋 Current agents:")
        for agent in agents:
            print(f"  - {agent.get('name')}: {agent.get('model_name')}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        await close_mongo_connection()

if __name__ == "__main__":
    print("🚀 Updating agents to Claude...")
    asyncio.run(update_all_agents_to_claude())
    print("✅ Done!")