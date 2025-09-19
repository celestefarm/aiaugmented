#!/usr/bin/env python3
"""
Debug script to diagnose Celeste's login issue
Tests user existence and password verification
"""

import asyncio
import os
import sys
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import hashlib
import secrets

# Load environment variables
load_dotenv()

# Test credentials
TEST_EMAIL = "celeste.fcp@gmail.co"
TEST_PASSWORD = "celeste060291"

async def main():
    print("=== CELESTE LOGIN DIAGNOSTIC ===")
    print(f"Testing credentials for: {TEST_EMAIL}")
    print(f"Password length: {len(TEST_PASSWORD)}")
    print()
    
    # Connect to MongoDB
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    print(f"Connecting to MongoDB Atlas...")
    print(f"Database: agentic_boardroom")
    
    try:
        client = AsyncIOMotorClient(mongodb_uri)
        database = client.agentic_boardroom
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        print()
        
        # Check if user exists
        print("=== USER EXISTENCE CHECK ===")
        user_doc = await database.users.find_one({"email": TEST_EMAIL})
        
        if not user_doc:
            print("❌ CRITICAL ISSUE FOUND: User does not exist in database")
            print(f"   Email '{TEST_EMAIL}' not found in users collection")
            print()
            
            # Check if there are any users at all
            user_count = await database.users.count_documents({})
            print(f"Total users in database: {user_count}")
            
            if user_count > 0:
                print("\nExisting users (first 5):")
                cursor = database.users.find({}, {"email": 1, "name": 1, "created_at": 1}).limit(5)
                async for user in cursor:
                    print(f"  - {user.get('email', 'N/A')} ({user.get('name', 'N/A')})")
            
            print("\n🔧 SOLUTION: User needs to be created or email is incorrect")
            return
        
        print("✅ User exists in database")
        print(f"   User ID: {user_doc['_id']}")
        print(f"   Name: {user_doc.get('name', 'N/A')}")
        print(f"   Email: {user_doc.get('email', 'N/A')}")
        print(f"   Active: {user_doc.get('is_active', 'N/A')}")
        print(f"   Created: {user_doc.get('created_at', 'N/A')}")
        print(f"   Last Login: {user_doc.get('last_login', 'Never')}")
        print()
        
        # Check if user is active
        if not user_doc.get('is_active', True):
            print("❌ CRITICAL ISSUE FOUND: User account is inactive")
            print("🔧 SOLUTION: Activate user account")
            return
        
        # Test password verification
        print("=== PASSWORD VERIFICATION TEST ===")
        stored_hash = user_doc.get('password_hash')
        
        if not stored_hash:
            print("❌ CRITICAL ISSUE FOUND: No password hash stored for user")
            print("🔧 SOLUTION: User needs to reset password or be recreated")
            return
        
        print(f"Stored hash length: {len(stored_hash)}")
        print(f"Hash starts with: {stored_hash[:20]}...")
        
        # Test bcrypt verification (current method)
        try:
            bcrypt_result = bcrypt.checkpw(TEST_PASSWORD.encode('utf-8'), stored_hash.encode('utf-8'))
            print(f"Bcrypt verification result: {bcrypt_result}")
            
            if bcrypt_result:
                print("✅ Password verification successful with bcrypt")
                print("🔧 DIAGNOSIS: Authentication should work - issue may be elsewhere")
            else:
                print("❌ CRITICAL ISSUE FOUND: Password verification failed with bcrypt")
                
                # Test if it might be using old simple hash method
                print("\nTesting legacy hash methods...")
                
                # Test simple hash method (from the commented code)
                try:
                    if '$' in stored_hash:
                        salt, stored_simple_hash = stored_hash.split('$', 1)
                        password_salt = f"{TEST_PASSWORD}{salt}"
                        computed_hash = hashlib.sha256(password_salt.encode()).hexdigest()
                        simple_result = computed_hash == stored_simple_hash
                        print(f"Simple hash verification result: {simple_result}")
                        
                        if simple_result:
                            print("✅ Password matches using legacy simple hash method")
                            print("🔧 SOLUTION: User password needs to be migrated to bcrypt")
                        else:
                            print("❌ Password doesn't match legacy simple hash either")
                    else:
                        print("Hash format doesn't match legacy simple hash pattern")
                except Exception as e:
                    print(f"Error testing legacy hash: {e}")
                
                if not bcrypt_result:
                    print("\n🔧 SOLUTION: Password is incorrect or hash is corrupted")
                    print("   - User may need to reset password")
                    print("   - Or password may have been changed")
                    print("   - Or hash migration issue occurred")
        
        except Exception as e:
            print(f"❌ Error during password verification: {e}")
            print("🔧 SOLUTION: Password hash may be corrupted or in wrong format")
        
        print()
        
        # Test workspace access
        print("=== WORKSPACE ACCESS TEST ===")
        user_id_str = str(user_doc['_id'])
        workspace_count = await database.workspaces.count_documents({"owner_id": user_id_str})
        print(f"Workspaces owned by user: {workspace_count}")
        
        if workspace_count > 0:
            print("✅ User has workspaces - workspace loading should work after login")
            
            # Show first few workspaces
            cursor = database.workspaces.find({"owner_id": user_id_str}, {"title": 1, "created_at": 1}).limit(3)
            print("User's workspaces:")
            async for workspace in cursor:
                print(f"  - {workspace.get('title', 'Untitled')} (ID: {workspace['_id']})")
        else:
            print("⚠️  User has no workspaces - will see empty workspace list after login")
        
        print()
        print("=== DIAGNOSTIC COMPLETE ===")
        
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        print("🔧 SOLUTION: Check MongoDB connection and credentials")
    finally:
        if 'client' in locals():
            client.close()

if __name__ == "__main__":
    asyncio.run(main())