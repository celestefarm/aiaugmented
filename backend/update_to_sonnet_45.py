import asyncio
from database import connect_to_mongo, close_mongo_connection, get_database

async def update_to_sonnet_45():
    await connect_to_mongo()
    db = get_database()
    
    if db is None:
        print("❌ Database not available")
        return False
    
    try:
        # Try the most likely model name format
        model_name = "claude-sonnet-4.5"  # Update this if different
        
        result = await db.agents.update_many(
            {},
            {"$set": {"model_name": model_name}}
        )
        
        print(f"✅ Updated {result.modified_count} agent(s) to use Claude Sonnet 4.5")
        
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
    print("🚀 Upgrading to Claude Sonnet 4.5...")
    asyncio.run(update_to_sonnet_45())
    print("✅ Done!")