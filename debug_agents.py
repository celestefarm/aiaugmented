import asyncio
from database import connect_to_mongo, get_database, close_mongo_connection
from models.agent import AgentInDB

async def debug_agents():
    await connect_to_mongo()
    db = get_database()
    
    if db is None:
        print("❌ Database not available")
        return
    
    agents_collection = db.agents
    
    try:
        # Get all agents
        agents_cursor = agents_collection.find({})
        agents_docs = await agents_cursor.to_list(length=None)
        
        print(f"Found {len(agents_docs)} agents in database")
        
        for i, agent_doc in enumerate(agents_docs):
            print(f"\n--- Agent {i+1} ---")
            print(f"ID: {agent_doc.get('_id')}")
            print(f"agent_id: {agent_doc.get('agent_id')}")
            print(f"name: {agent_doc.get('name')}")
            print(f"is_custom: {agent_doc.get('is_custom')}")
            print(f"is_active: {agent_doc.get('is_active')}")
            print(f"model_name: {agent_doc.get('model_name')}")
            
            # Try to create AgentInDB object
            try:
                agent_in_db = AgentInDB(**agent_doc)
                print("✅ AgentInDB creation: SUCCESS")
                
                # Try to convert to response
                try:
                    response = agent_in_db.to_response()
                    print("✅ to_response(): SUCCESS")
                except Exception as e:
                    print(f"❌ to_response() failed: {e}")
                    
            except Exception as e:
                print(f"❌ AgentInDB creation failed: {e}")
                print(f"Missing fields: {set(['agent_id', 'name', 'ai_role', 'human_role', 'is_custom', 'is_active']) - set(agent_doc.keys())}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(debug_agents())