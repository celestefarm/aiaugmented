#!/usr/bin/env python3
"""
Script to create a test user account for login testing
"""

import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt

# Load environment variables
load_dotenv()

# User details
USER_EMAIL = "test@example.com"
USER_PASSWORD = "password123"
USER_NAME = "Test User"

async def create_test_user():
    print("=== CREATING TEST USER ACCOUNT ===")
    print(f"Email: {USER_EMAIL}")
    print(f"Name: {USER_NAME}")
    print(f"Password: {USER_PASSWORD}")
    print()
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    print("Connecting to MongoDB...")
    
    try:
        client = AsyncIOMotorClient(mongodb_uri)
        database = client.agentic_boardroom
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        print()
        
        # Check if user already exists
        print("=== CHECKING IF USER EXISTS ===")
        existing_user = await database.users.find_one({"email": USER_EMAIL})
        
        if existing_user:
            print(f"⚠️  User already exists with email: {USER_EMAIL}")
            print(f"   User ID: {existing_user['_id']}")
            print(f"   Name: {existing_user.get('name', 'N/A')}")
            print(f"   Active: {existing_user.get('is_active', 'N/A')}")
            print(f"   Created: {existing_user.get('created_at', 'N/A')}")
            
            # Update the password to fix the authentication issue
            print("\n🔧 User exists - updating password to fix authentication...")
            
            # Hash the password using bcrypt
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(USER_PASSWORD.encode('utf-8'), salt).decode('utf-8')
            
            # Update the user's password
            result = await database.users.update_one(
                {"email": USER_EMAIL},
                {
                    "$set": {
                        "password_hash": password_hash,
                        "name": USER_NAME,
                        "is_active": True,  # Ensure user is active
                        "last_login": None  # Reset last login
                    }
                }
            )
            
            if result.modified_count > 0:
                print("✅ Password updated successfully")
            else:
                print("❌ Failed to update password")
                return False
        else:
            print("User does not exist - creating new user...")
            
            # Hash the password using bcrypt
            print("Hashing password...")
            salt = bcrypt.gensalt()
            password_hash = bcrypt.hashpw(USER_PASSWORD.encode('utf-8'), salt).decode('utf-8')
            print(f"Password hashed successfully, hash length: {len(password_hash)}")
            
            # Create user document
            user_doc = {
                "email": USER_EMAIL,
                "password_hash": password_hash,
                "name": USER_NAME,
                "created_at": datetime.utcnow(),
                "last_login": None,
                "is_active": True
            }
            
            print("Inserting user into database...")
            result = await database.users.insert_one(user_doc)
            user_id = result.inserted_id
            print(f"✅ User created successfully with ID: {user_id}")
        
        # Verify the user can be found and password works
        print("\n=== VERIFICATION ===")
        user_doc = await database.users.find_one({"email": USER_EMAIL})
        
        if user_doc:
            print("✅ User found in database")
            
            # Test password verification
            stored_hash = user_doc.get('password_hash')
            password_valid = bcrypt.checkpw(USER_PASSWORD.encode('utf-8'), stored_hash.encode('utf-8'))
            
            if password_valid:
                print("✅ Password verification successful")
                print("\n🎉 TEST USER ACCOUNT IS READY!")
                print(f"   Email: {USER_EMAIL}")
                print(f"   Password: {USER_PASSWORD}")
                print("   User should now be able to sign in successfully")
                return True
            else:
                print("❌ Password verification failed")
                return False
        else:
            print("❌ User not found after creation")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if 'client' in locals():
            client.close()

async def create_sample_workspace(user_email):
    """Create a sample workspace for the user"""
    print("\n=== CREATING SAMPLE WORKSPACE ===")
    
    try:
        client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
        database = client.agentic_boardroom
        
        # Find the user
        user_doc = await database.users.find_one({"email": user_email})
        if not user_doc:
            print("❌ User not found for workspace creation")
            return False
        
        user_id = str(user_doc['_id'])
        
        # Check if user already has workspaces
        existing_workspaces = await database.workspaces.count_documents({"owner_id": user_id})
        
        if existing_workspaces > 0:
            print(f"✅ User already has {existing_workspaces} workspace(s)")
            return True
        
        # Create a sample workspace
        workspace_doc = {
            "title": "Test Workspace",
            "owner_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "settings": {},
            "transform": {"x": 0, "y": 0, "scale": 1}
        }
        
        result = await database.workspaces.insert_one(workspace_doc)
        workspace_id = result.inserted_id
        
        print(f"✅ Sample workspace created with ID: {workspace_id}")
        print(f"   Title: Test Workspace")
        print("   User will see this workspace after login")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating workspace: {e}")
        return False
    finally:
        if 'client' in locals():
            client.close()

async def main():
    success = await create_test_user()
    
    if success:
        # Also create a sample workspace
        await create_sample_workspace(USER_EMAIL)
        
        print("\n=== SETUP COMPLETE ===")
        print("✅ Test user account created and verified")
        print("✅ Sample workspace created")
        print("🚀 Test user should now be able to sign in and access the workspace!")
        print(f"\n📋 LOGIN CREDENTIALS:")
        print(f"   Email: {USER_EMAIL}")
        print(f"   Password: {USER_PASSWORD}")
    else:
        print("\n❌ Setup failed - please check the errors above")

if __name__ == "__main__":
    asyncio.run(main())