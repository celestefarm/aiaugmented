#!/usr/bin/env python3

"""
Create a test user for the node deletion race condition test.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import get_database
from models.user import UserCreate
from utils.auth import hash_password
from datetime import datetime

async def create_test_user():
    """Create a test user for the deletion test"""
    print("🔧 Creating test user...")
    
    try:
        # Get database
        database = get_database()
        
        # Check if user already exists
        existing_user = await database.users.find_one({"email": "celeste.fco@gmail.com"})
        if existing_user:
            print("✅ Test user already exists")
            return True
            
        # Create test user
        user_data = UserCreate(
            email="celeste.fco@gmail.com",
            password="password123",
            name="Celeste Test User"
        )
        
        # Hash password
        hashed_password = hash_password(user_data.password)
        
        # Create user document
        user_doc = {
            "email": user_data.email,
            "name": user_data.name,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "position": None,
            "goal": None
        }
        
        # Insert user
        result = await database.users.insert_one(user_doc)
        user_id = str(result.inserted_id)
        
        print(f"✅ Test user created with ID: {user_id}")
        
        # Create a test workspace for the user
        workspace_doc = {
            "title": "Test Workspace",
            "owner_id": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "settings": {
                "active_agents": ["strategist"]
            },
            "transform": {
                "x": 0,
                "y": 0,
                "scale": 1
            }
        }
        
        workspace_result = await database.workspaces.insert_one(workspace_doc)
        workspace_id = str(workspace_result.inserted_id)
        
        print(f"✅ Test workspace created with ID: {workspace_id}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """Main function"""
    success = await create_test_user()
    return success

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(0 if result else 1)