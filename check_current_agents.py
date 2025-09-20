import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_agents():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.wild_beaver_climb
    
    print('Current agents in database:')
    async for agent in db.agents.find({}, {'agent_id': 1, 'name': 1}):
        print(f'  - ID: {agent["agent_id"]}, Name: {agent["name"]}')
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_agents())