#!/usr/bin/env python3
"""
Script to create a test user in the MongoDB database.
This script creates a user with email 'celeste.fcp@gmail.com' and password 'celeste060291'.
"""

import asyncio
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from utils.auth import hash_password
from models.user import UserInDB
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


async def create_test_user():
    """Create a test user in the database"""
    
    # Database connection
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongodb_uri)
    database = client.agentic_boardroom
    users_collection = database.users
    
    try:
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        
        # User details
        email = "celeste.fcp@gmail.com"
        password = "celeste060291"
        name = "Celeste Test User"
        
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": email})
        if existing_user:
            print(f"⚠️  User with email {email} already exists. Updating password...")
            
            # Update existing user's password
            password_hash = hash_password(password)
            result = await users_collection.update_one(
                {"email": email},
                {
                    "$set": {
                        "password_hash": password_hash,
                        "last_login": None,
                        "is_active": True
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"✅ Successfully updated password for user: {email}")
            else:
                print(f"❌ Failed to update password for user: {email}")
                
        else:
            # Create new user
            password_hash = hash_password(password)
            
            # Create user document
            user_data = {
                "email": email,
                "password_hash": password_hash,
                "name": name,
                "created_at": datetime.utcnow(),
                "last_login": None,
                "is_active": True
            }
            
            # Insert user into database
            result = await users_collection.insert_one(user_data)
            
            if result.inserted_id:
                print(f"✅ Successfully created test user: {email}")
                print(f"   User ID: {result.inserted_id}")
                print(f"   Name: {name}")
                print(f"   Password: {password}")
            else:
                print(f"❌ Failed to create test user: {email}")
        
        # Verify user was created/updated
        user = await users_collection.find_one({"email": email})
        if user:
            print(f"✅ User verification successful:")
            print(f"   Email: {user['email']}")
            print(f"   Name: {user['name']}")
            print(f"   Created: {user['created_at']}")
            print(f"   Active: {user['is_active']}")
        else:
            print(f"❌ User verification failed - user not found in database")
            
    except Exception as e:
        print(f"❌ Error creating test user: {e}")
        print(f"❌ Error type: {type(e).__name__}")
        sys.exit(1)
        
    finally:
        # Close database connection
        client.close()
        print("🔌 Disconnected from MongoDB")


if __name__ == "__main__":
    print("🚀 Creating test user...")
    asyncio.run(create_test_user())
    print("✨ Script completed!")