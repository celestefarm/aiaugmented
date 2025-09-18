#!/usr/bin/env python3
"""
Simple script to reset a user's password in the database
"""
import asyncio
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def reset_user_password():
    # Database connection
    MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "agentic_boardroom")
    
    client = AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
    users_collection = db.users
    
    # User details
    email = "celeste.fcp@gmail.com"
    new_password = "celeste060291"
    
    try:
        # Hash the new password
        password_bytes = new_password.encode('utf-8')
        salt = bcrypt.gensalt()
        password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
        
        # Update the user's password
        result = await users_collection.update_one(
            {"email": email},
            {
                "$set": {
                    "password_hash": password_hash,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count > 0:
            print(f"✅ Successfully updated password for {email}")
        else:
            print(f"❌ User {email} not found or password not updated")
            
    except Exception as e:
        print(f"❌ Error updating password: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(reset_user_password())