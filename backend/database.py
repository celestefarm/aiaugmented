from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

# Global database client and database
db_client = None
database = None


async def connect_to_mongo():
    """Connect to MongoDB and return database instance"""
    global db_client, database
    
    # If already connected, return existing database
    if database is not None:
        return database
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    db_client = AsyncIOMotorClient(mongodb_uri)
    database = db_client.agentic_boardroom
    
    # Test connection
    try:
        await db_client.admin.command('ping')
        print("[OK] Connected to MongoDB successfully")
        return database
    except Exception as e:
        print(f"[ERROR] Failed to connect to MongoDB: {e}")
        print(f"[ERROR] MongoDB URI: {mongodb_uri}")
        print(f"[ERROR] Error type: {type(e).__name__}")
        print("[ERROR] This usually means:")
        print("   1. MongoDB server is not running")
        print("   2. MongoDB is not installed")
        print("   3. MongoDB is running on a different port")
        print("   4. Network connectivity issues")
        return None


async def close_mongo_connection():
    """Close MongoDB connection"""
    global db_client
    if db_client:
        db_client.close()
        print("Disconnected from MongoDB")


def get_database():
    """Get the database instance"""
    return database