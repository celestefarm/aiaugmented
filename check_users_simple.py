import asyncio
import sys
sys.path.append('backend')
from database_memory import get_database

async def check_users():
    db = get_database()
    if db:
        users = await db.users.find({}).to_list(length=None)
        print('Users in database:')
        for user in users:
            print(f'  Email: {user.get("email")}, Name: {user.get("name")}, Active: {user.get("is_active")}')
    else:
        print('Database not available')

asyncio.run(check_users())