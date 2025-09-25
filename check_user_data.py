import asyncio
from backend.database_memory import connect_to_mongo, get_database, close_mongo_connection

async def check_user_data():
    await connect_to_mongo()
    db = get_database()
    
    # Find user with email celeste.fcp@gmail.com
    user = await db.users.find_one({'email': 'celeste.fcp@gmail.com'})
    if user:
        print('Current user data:')
        print(f'  Email: {user.get("email")}')
        print(f'  Name: {user.get("name")}')
        print(f'  ID: {user.get("_id")}')
    else:
        print('User not found')
    
    # Also check all users
    users = await db.users.find({}).to_list(length=None)
    print(f'\nAll users in database ({len(users)}):')
    for u in users:
        print(f'  - {u.get("email")}: "{u.get("name")}"')
    
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(check_user_data())