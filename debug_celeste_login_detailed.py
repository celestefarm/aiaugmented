#!/usr/bin/env python3
"""
Detailed debugging script for Celeste login issue.
This script will:
1. Check if the user exists in the database
2. Verify the password hash
3. Test the password verification function
4. Check user status
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from database import connect_to_mongo, get_database
from utils.auth import hash_password, verify_password
from models.user import UserInDB
from bson import ObjectId

async def debug_celeste_login():
    """Debug the Celeste login issue step by step"""
    
    print("=== CELESTE LOGIN DEBUG SESSION ===")
    print("Target user: celeste.fcp@gmail.com")
    print("Target password: celeste060291")
    print()
    
    try:
        # Connect to database
        print("1. Connecting to database...")
        await connect_to_mongo()
        database = get_database()
        print("✅ Database connection successful")
        print()
        
        # Check if user exists
        print("2. Checking if user exists...")
        user_doc = await database.users.find_one({"email": "celeste.fcp@gmail.com"})
        
        if not user_doc:
            print("❌ User NOT FOUND in database")
            print("Available users:")
            async for user in database.users.find({}, {"email": 1, "_id": 1}):
                print(f"  - {user['email']} (ID: {user['_id']})")
            
            print("\n🔧 CREATING USER...")
            # Create the user with the expected password
            password_hash = hash_password("celeste060291")
            
            from datetime import datetime
            from models.user import UserCreate
            
            user_create = UserCreate(
                email="celeste.fcp@gmail.com",
                password_hash=password_hash,
                name="Celeste",
                created_at=datetime.utcnow(),
                is_active=True
            )
            
            result = await database.users.insert_one(user_create.model_dump())
            print(f"✅ User created with ID: {result.inserted_id}")
            
            # Retrieve the created user
            user_doc = await database.users.find_one({"_id": result.inserted_id})
            
        else:
            print("✅ User FOUND in database")
            print(f"  - ID: {user_doc['_id']}")
            print(f"  - Email: {user_doc['email']}")
            print(f"  - Name: {user_doc.get('name', 'N/A')}")
            print(f"  - Active: {user_doc.get('is_active', 'N/A')}")
            print(f"  - Created: {user_doc.get('created_at', 'N/A')}")
            print(f"  - Last Login: {user_doc.get('last_login', 'Never')}")
        
        print()
        
        # Convert ObjectId to string for Pydantic compatibility
        if user_doc and "_id" in user_doc:
            user_doc["_id"] = str(user_doc["_id"])
        
        user_in_db = UserInDB(**user_doc)
        
        # Check password hash
        print("3. Analyzing password hash...")
        stored_hash = user_in_db.password_hash
        print(f"  - Stored hash: {stored_hash[:50]}...")
        print(f"  - Hash length: {len(stored_hash)}")
        print(f"  - Hash type: {'bcrypt' if stored_hash.startswith('$2b$') else 'other'}")
        print()
        
        # Test password verification
        print("4. Testing password verification...")
        test_password = "celeste060291"
        
        print(f"  - Testing password: '{test_password}'")
        print(f"  - Against hash: {stored_hash[:50]}...")
        
        # Test the verification function
        is_valid = verify_password(test_password, stored_hash)
        print(f"  - Verification result: {is_valid}")
        
        if is_valid:
            print("✅ Password verification SUCCESSFUL")
        else:
            print("❌ Password verification FAILED")
            
            # Try to create a new hash and test it
            print("\n🔧 Testing hash generation...")
            new_hash = hash_password(test_password)
            print(f"  - New hash: {new_hash[:50]}...")
            new_verification = verify_password(test_password, new_hash)
            print(f"  - New hash verification: {new_verification}")
            
            if new_verification:
                print("✅ New hash works - updating user password...")
                await database.users.update_one(
                    {"email": "celeste.fcp@gmail.com"},
                    {"$set": {"password_hash": new_hash}}
                )
                print("✅ Password hash updated in database")
            else:
                print("❌ Even new hash doesn't work - there's a problem with the hash function")
        
        print()
        
        # Check user status
        print("5. Checking user status...")
        if user_in_db.is_active:
            print("✅ User is ACTIVE")
        else:
            print("❌ User is INACTIVE")
            print("🔧 Activating user...")
            await database.users.update_one(
                {"email": "celeste.fcp@gmail.com"},
                {"$set": {"is_active": True}}
            )
            print("✅ User activated")
        
        print()
        print("=== DEBUG SUMMARY ===")
        print(f"User exists: {'✅' if user_doc else '❌'}")
        print(f"Password valid: {'✅' if is_valid else '❌'}")
        print(f"User active: {'✅' if user_in_db.is_active else '❌'}")
        
        if user_doc and is_valid and user_in_db.is_active:
            print("\n🎉 ALL CHECKS PASSED - Login should work!")
        else:
            print("\n⚠️  Some issues found and fixed - try login again")
            
    except Exception as e:
        print(f"❌ Error during debug: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_celeste_login())