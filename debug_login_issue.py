#!/usr/bin/env python3
"""
Debug script to investigate login issues for user: celeste.fcp@gmail.com
"""

import asyncio
import sys
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import hashlib
import secrets

# Load environment variables
load_dotenv()

# Test credentials
TEST_EMAIL = "celeste.fcp@gmail.com"
TEST_PASSWORD = "celeste060291"

async def connect_to_database():
    """Connect to MongoDB database"""
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    print(f"🔗 Connecting to MongoDB...")
    print(f"📍 URI: {mongodb_uri[:50]}...")  # Show partial URI for security
    
    try:
        client = AsyncIOMotorClient(mongodb_uri)
        database = client.agentic_boardroom
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        return database
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return None

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt (current method)"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password_bcrypt(plain_password: str, hashed_password: str) -> bool:
    """Verify password using bcrypt (current method)"""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception as e:
        print(f"❌ Bcrypt verification error: {e}")
        return False

def hash_password_simple(password: str, salt: str = None) -> str:
    """Simple password hashing using SHA-256 with salt (legacy method)"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    password_salt = f"{password}{salt}"
    hashed = hashlib.sha256(password_salt.encode()).hexdigest()
    return f"{salt}${hashed}"

def verify_password_simple(password: str, hashed_password: str) -> bool:
    """Verify password against simple hash (legacy method)"""
    try:
        salt, stored_hash = hashed_password.split('$', 1)
        password_salt = f"{password}{salt}"
        computed_hash = hashlib.sha256(password_salt.encode()).hexdigest()
        return computed_hash == stored_hash
    except ValueError:
        return False

async def check_user_in_database(database):
    """Check if user exists in database and examine their record"""
    print(f"\n🔍 Searching for user: {TEST_EMAIL}")
    
    try:
        user_doc = await database.users.find_one({"email": TEST_EMAIL})
        
        if not user_doc:
            print("❌ User not found in database")
            
            # Check if there are any users at all
            user_count = await database.users.count_documents({})
            print(f"📊 Total users in database: {user_count}")
            
            if user_count > 0:
                print("👥 Existing users:")
                async for user in database.users.find({}, {"email": 1, "name": 1, "created_at": 1}):
                    print(f"   - {user.get('email', 'N/A')} ({user.get('name', 'N/A')}) - Created: {user.get('created_at', 'N/A')}")
            
            return None
        
        print("✅ User found in database")
        print(f"📧 Email: {user_doc.get('email')}")
        print(f"👤 Name: {user_doc.get('name')}")
        print(f"🆔 ID: {user_doc.get('_id')}")
        print(f"📅 Created: {user_doc.get('created_at')}")
        print(f"🔄 Last Login: {user_doc.get('last_login', 'Never')}")
        print(f"✅ Active: {user_doc.get('is_active', False)}")
        print(f"🔐 Password Hash Length: {len(user_doc.get('password_hash', ''))}")
        print(f"🔐 Password Hash Preview: {user_doc.get('password_hash', '')[:50]}...")
        
        return user_doc
        
    except Exception as e:
        print(f"❌ Error checking user: {e}")
        return None

async def test_password_verification(user_doc):
    """Test password verification with different methods"""
    if not user_doc:
        return False
    
    stored_hash = user_doc.get('password_hash', '')
    print(f"\n🔐 Testing password verification...")
    print(f"📝 Test Password: {TEST_PASSWORD}")
    print(f"🔐 Stored Hash: {stored_hash[:50]}...")
    
    # Test bcrypt method (current)
    print("\n🧪 Testing bcrypt verification (current method):")
    try:
        bcrypt_result = verify_password_bcrypt(TEST_PASSWORD, stored_hash)
        print(f"   Result: {'✅ PASS' if bcrypt_result else '❌ FAIL'}")
    except Exception as e:
        print(f"   Error: {e}")
        bcrypt_result = False
    
    # Test simple hash method (legacy)
    print("\n🧪 Testing simple hash verification (legacy method):")
    try:
        simple_result = verify_password_simple(TEST_PASSWORD, stored_hash)
        print(f"   Result: {'✅ PASS' if simple_result else '❌ FAIL'}")
    except Exception as e:
        print(f"   Error: {e}")
        simple_result = False
    
    # Test if hash looks like bcrypt
    print(f"\n🔍 Hash Analysis:")
    print(f"   Starts with '$2b$': {'✅ Yes' if stored_hash.startswith('$2b$') else '❌ No'}")
    print(f"   Contains '$': {'✅ Yes' if '$' in stored_hash else '❌ No'}")
    print(f"   Length: {len(stored_hash)} characters")
    
    return bcrypt_result or simple_result

async def create_test_user(database):
    """Create a test user with the provided credentials"""
    print(f"\n🆕 Creating test user: {TEST_EMAIL}")
    
    try:
        # Check if user already exists
        existing_user = await database.users.find_one({"email": TEST_EMAIL})
        if existing_user:
            print("⚠️  User already exists, skipping creation")
            return existing_user
        
        # Hash the password using bcrypt
        password_hash = hash_password_bcrypt(TEST_PASSWORD)
        print(f"🔐 Generated hash: {password_hash[:50]}...")
        
        # Create user document
        user_doc = {
            "email": TEST_EMAIL,
            "password_hash": password_hash,
            "name": "Celeste Test User",
            "created_at": datetime.utcnow(),
            "is_active": True
        }
        
        # Insert user
        result = await database.users.insert_one(user_doc)
        print(f"✅ User created with ID: {result.inserted_id}")
        
        # Retrieve and return the created user
        created_user = await database.users.find_one({"_id": result.inserted_id})
        return created_user
        
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        return None

async def test_login_flow(database):
    """Test the complete login flow"""
    print(f"\n🔄 Testing complete login flow...")
    
    # Find user
    user_doc = await database.users.find_one({"email": TEST_EMAIL})
    if not user_doc:
        print("❌ User not found for login test")
        return False
    
    # Verify password
    password_valid = verify_password_bcrypt(TEST_PASSWORD, user_doc.get('password_hash', ''))
    print(f"🔐 Password verification: {'✅ PASS' if password_valid else '❌ FAIL'}")
    
    # Check if user is active
    is_active = user_doc.get('is_active', False)
    print(f"✅ User active: {'✅ Yes' if is_active else '❌ No'}")
    
    login_success = password_valid and is_active
    print(f"🎯 Login would {'✅ SUCCEED' if login_success else '❌ FAIL'}")
    
    return login_success

async def main():
    """Main diagnostic function"""
    print("🐛 LOGIN ISSUE DIAGNOSTIC TOOL")
    print("=" * 50)
    print(f"📧 Testing login for: {TEST_EMAIL}")
    print(f"🔑 Testing password: {TEST_PASSWORD}")
    print("=" * 50)
    
    # Connect to database
    database = await connect_to_database()
    if not database:
        print("❌ Cannot proceed without database connection")
        return
    
    # Check if user exists
    user_doc = await check_user_in_database(database)
    
    if user_doc:
        # Test password verification
        password_works = await test_password_verification(user_doc)
        
        if password_works:
            print("\n✅ DIAGNOSIS: Password verification works!")
            print("🔍 The issue might be elsewhere in the authentication flow.")
        else:
            print("\n❌ DIAGNOSIS: Password verification failed!")
            print("🔧 RECOMMENDED ACTIONS:")
            print("   1. User may need to reset their password")
            print("   2. Password hash may be corrupted")
            print("   3. Password may have been changed")
            
            # Offer to recreate user with correct password
            response = input("\n❓ Would you like to recreate the user with the correct password? (y/N): ")
            if response.lower() == 'y':
                # Delete existing user
                await database.users.delete_one({"email": TEST_EMAIL})
                print("🗑️  Deleted existing user")
                
                # Create new user
                new_user = await create_test_user(database)
                if new_user:
                    await test_login_flow(database)
    else:
        print("\n❌ DIAGNOSIS: User does not exist in database!")
        print("🔧 RECOMMENDED ACTION: Create the user account")
        
        # Offer to create user
        response = input("\n❓ Would you like to create the user account? (y/N): ")
        if response.lower() == 'y':
            new_user = await create_test_user(database)
            if new_user:
                await test_login_flow(database)
    
    print("\n" + "=" * 50)
    print("🏁 DIAGNOSTIC COMPLETE")

if __name__ == "__main__":
    asyncio.run(main())