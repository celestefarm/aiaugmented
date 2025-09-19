import asyncio
from database import get_database
from utils.auth import verify_password

async def check_user():
    try:
        database = get_database()
        print("=== CHECKING CELESTE USER ===")
        
        # Find user by email
        user_doc = await database.users.find_one({"email": "celeste.fcp@gmail.com"})
        
        if not user_doc:
            print("❌ User not found with email: celeste.fcp@gmail.com")
            return
        
        print(f"✅ User found:")
        print(f"  ID: {user_doc['_id']}")
        print(f"  Email: {user_doc['email']}")
        print(f"  Name: {user_doc['name']}")
        print(f"  Active: {user_doc.get('is_active', 'Unknown')}")
        print(f"  Created: {user_doc.get('created_at', 'Unknown')}")
        print(f"  Password hash length: {len(user_doc.get('password_hash', ''))}")
        
        # Test password verification
        password_hash = user_doc.get('password_hash', '')
        if password_hash:
            password_valid = verify_password("celeste060291", password_hash)
            print(f"  Password verification: {'✅ VALID' if password_valid else '❌ INVALID'}")
        else:
            print("  ❌ No password hash found")
            
    except Exception as e:
        print(f"❌ Error checking user: {e}")
        print(f"Error type: {type(e)}")

if __name__ == "__main__":
    asyncio.run(check_user())