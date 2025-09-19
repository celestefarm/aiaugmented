#!/usr/bin/env python3
"""
Quick script to check existing users in the database
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def check_users():
    print("=== CHECKING DATABASE USERS ===")
    
    try:
        client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
        database = client.agentic_boardroom
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB Atlas")
        
        # Count total users
        user_count = await database.users.count_documents({})
        print(f"Total users in database: {user_count}")
        
        if user_count > 0:
            print("\nExisting users:")
            cursor = database.users.find({}, {"email": 1, "name": 1, "created_at": 1, "is_active": 1})
            async for user in cursor:
                print(f"  - {user.get('email', 'N/A')} ({user.get('name', 'N/A')}) - Active: {user.get('is_active', 'N/A')}")
        
        # Check workspaces
        workspace_count = await database.workspaces.count_documents({})
        print(f"\nTotal workspaces in database: {workspace_count}")
        
        if workspace_count > 0:
            print("\nExisting workspaces:")
            cursor = database.workspaces.find({}, {"title": 1, "owner_id": 1, "created_at": 1}).limit(5)
            async for workspace in cursor:
                print(f"  - {workspace.get('title', 'Untitled')} (Owner: {workspace.get('owner_id', 'N/A')})")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(check_users())