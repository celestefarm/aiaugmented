#!/usr/bin/env python3
"""
Diagnostic script to check database state and user existence
"""
import asyncio
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import connect_to_mongo, get_database
from utils.auth import hash_password

async def main():
    print("=== DATABASE STATE DIAGNOSTIC ===")
    
    # Connect to database
    print("1. Connecting to database...")
    db = await connect_to_mongo()
    
    if db is None:
        print("❌ Database connection failed!")
        return
    
    print(f"✅ Database connected: {type(db)}")
    
    # Check if get_database() returns the same instance
    print("\n2. Checking get_database() function...")
    db_from_getter = get_database()
    print(f"Database from get_database(): {type(db_from_getter)}")
    print(f"Are they the same instance? {db is db_from_getter}")
    
    if db_from_getter is None:
        print("❌ get_database() returns None - THIS IS THE PROBLEM!")
    
    # Check existing users
    print("\n3. Checking existing users...")
    try:
        users = await db.users.find({})
        print(f"Found {len(users)} users in database:")
        for user in users:
            print(f"  - {user.get('email')} (ID: {user.get('_id')}, Active: {user.get('is_active')})")
    except Exception as e:
        print(f"❌ Error checking users: {e}")
    
    # Check for the specific user trying to log in
    print("\n4. Checking for celeste.fcp@gmail.com...")
    try:
        celeste_user = await db.users.find_one({"email": "celeste.fcp@gmail.com"})
        if celeste_user:
            print(f"✅ User found: {celeste_user}")
        else:
            print("❌ User 'celeste.fcp@gmail.com' not found")
            
            # Create the user for testing
            print("\n5. Creating test user...")
            from models.user import UserCreate
            from datetime import datetime
            
            password_hash = hash_password("celeste060291")
            user_create = UserCreate(
                email="celeste.fcp@gmail.com",
                password_hash=password_hash,
                name="Celeste Test User",
                created_at=datetime.utcnow(),
                is_active=True
            )
            
            result = await db.users.insert_one(user_create.model_dump())
            print(f"✅ User created with ID: {result.inserted_id}")
            
    except Exception as e:
        print(f"❌ Error checking/creating user: {e}")
    
    # Check workspaces collection (the error from logs)
    print("\n6. Checking workspaces collection...")
    try:
        workspaces = await db.workspaces.find({})
        print(f"Found {len(workspaces)} workspaces in database")
    except Exception as e:
        print(f"❌ Error checking workspaces: {e}")
    
    print("\n=== DIAGNOSTIC COMPLETE ===")

if __name__ == "__main__":
    asyncio.run(main())