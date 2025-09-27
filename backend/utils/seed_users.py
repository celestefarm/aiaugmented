from database_memory import get_database
from models.user import UserCreate, UserInDB
from utils.auth import hash_password
from datetime import datetime
from typing import List
import asyncio


# Default users for testing/development
DEFAULT_USERS = [
    {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291",
        "name": "Celeste Farm",
        "is_active": True
    },
    {
        "email": "admin@example.com", 
        "password": "admin123456",
        "name": "Admin User",
        "is_active": True
    },
    {
        "email": "test@example.com",
        "password": "test123456", 
        "name": "Test User",
        "is_active": True
    }
]


async def seed_users():
    """Seed the database with default users"""
    db = get_database()
    if db is None:
        print("Database not available for seeding users")
        return False
    
    users_collection = db.users
    
    try:
        # Clear existing users and re-seed to ensure correct passwords
        existing_users = await users_collection.find({}).to_list(length=None)
        existing_count = len(existing_users)
        if existing_count > 0:
            print(f"Found {existing_count} existing users. Clearing and re-seeding...")
            await users_collection.delete_many({})
        else:
            print("No existing users found. Proceeding with fresh seeding...")
        
        # Create user documents
        user_docs = []
        for user_data in DEFAULT_USERS:
            # Hash the password
            password_hash = hash_password(user_data["password"])
            
            user_create = UserCreate(
                email=user_data["email"],
                password_hash=password_hash,
                name=user_data["name"],
                created_at=datetime.utcnow(),
                is_active=user_data["is_active"]
            )
            
            user_in_db = UserInDB(**user_create.model_dump())
            user_docs.append(user_in_db.model_dump(by_alias=True, exclude={"id"}))
        
        # Insert all users
        for user_doc in user_docs:
            result = await users_collection.insert_one(user_doc)
            print(f"Created user: {user_doc['email']} (ID: {result.inserted_id})")
        
        print(f"Successfully seeded {len(user_docs)} default users")
        
        # Create indexes for better performance
        try:
            # Note: In-memory database might not support all index operations
            await users_collection.create_index("email", unique=True)
            print("Created email index for users collection")
        except Exception as e:
            print(f"Index creation skipped (in-memory database): {e}")
        
        return True
        
    except Exception as e:
        print(f"Failed to seed users: {e}")
        return False


async def get_all_users() -> List[UserInDB]:
    """Get all users from database"""
    db = get_database()
    if db is None:
        return []
    
    users_collection = db.users
    users_docs = await users_collection.find({}).to_list(length=None)
    users = []
    
    for user_doc in users_docs:
        # Convert ObjectId to string for Pydantic compatibility
        if user_doc and "_id" in user_doc:
            user_doc["_id"] = str(user_doc["_id"])
        user = UserInDB(**user_doc)
        users.append(user)
    
    return users


async def get_user_by_email(email: str) -> UserInDB | None:
    """Get user by email"""
    db = get_database()
    if db is None:
        return None
    
    users_collection = db.users
    user_doc = await users_collection.find_one({"email": email})
    
    if user_doc:
        # Convert ObjectId to string for Pydantic compatibility
        if user_doc and "_id" in user_doc:
            user_doc["_id"] = str(user_doc["_id"])
        return UserInDB(**user_doc)
    return None


async def create_user(user_data: UserCreate) -> UserInDB | None:
    """Create a new user"""
    db = get_database()
    if db is None:
        return None
    
    users_collection = db.users
    
    try:
        # Check if user already exists
        existing = await users_collection.find_one({"email": user_data.email})
        if existing:
            raise ValueError(f"User with email '{user_data.email}' already exists")
        
        user_in_db = UserInDB(**user_data.model_dump())
        user_doc = user_in_db.model_dump(by_alias=True, exclude={"id"})
        
        result = await users_collection.insert_one(user_doc)
        user_doc["_id"] = str(result.inserted_id)  # Convert to string
        
        return UserInDB(**user_doc)
        
    except Exception as e:
        print(f"❌ Failed to create user: {e}")
        return None


if __name__ == "__main__":
    # For testing the seeding function
    async def main():
        from database_memory import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        await seed_users()
        
        # Test getting users
        users = await get_all_users()
        print(f"\nTotal users in database: {len(users)}")
        for user in users:
            print(f"  - {user.email} (Active: {user.is_active})")
        
        await close_mongo_connection()
    
    asyncio.run(main())