from database_memory import get_database
from models.workspace import WorkspaceCreate, WorkspaceInDB
from models.message import MessageCreate, MessageInDB
from datetime import datetime
from bson import ObjectId
from typing import List
import asyncio


# Default workspaces for testing/development
DEFAULT_WORKSPACES = [
    {
        "title": "Strategic Planning Session",
        "owner_email": "celeste.fcp@gmail.com",
        "settings": {
            "active_agents": ["strategist"],
            "theme": "dark",
            "auto_save": True
        },
        "transform": {
            "x": 0,
            "y": 0,
            "scale": 1
        }
    },
    {
        "title": "Market Analysis Workspace",
        "owner_email": "celeste.fcp@gmail.com",
        "settings": {
            "active_agents": ["strategist", "market-competition-agent"],
            "theme": "dark",
            "auto_save": True
        },
        "transform": {
            "x": 0,
            "y": 0,
            "scale": 1
        }
    }
]

# Sample messages for testing Add to Map functionality
SAMPLE_MESSAGES = [
    {
        "author": "Celeste Farm",
        "type": "human",
        "content": "I need help developing a strategic plan for expanding our business into the European market. We have £25M in quarterly revenue targets and a discretionary budget of £2M."
    },
    {
        "author": "Strategic Co-Pilot",
        "type": "ai",
        "content": "Given your expansion goals and budget constraints, I recommend a phased approach to European market entry. First, conduct thorough market research in 2-3 target countries to identify the most promising opportunities. This should consume approximately £200K of your budget. Second, establish strategic partnerships with local distributors or resellers to minimize initial infrastructure costs. Third, develop localized marketing campaigns that resonate with European consumers while maintaining your brand identity."
    },
    {
        "author": "Celeste Farm",
        "type": "human",
        "content": "What are the key risks we should consider for this European expansion?"
    },
    {
        "author": "Strategic Co-Pilot",
        "type": "ai",
        "content": "Key risks for European expansion include: 1) Regulatory compliance - GDPR, local business regulations, and tax implications vary significantly by country. 2) Currency fluctuation - Brexit and economic uncertainty could impact exchange rates and profitability. 3) Cultural adaptation - Consumer preferences and business practices differ across European markets. 4) Competition - Established local players may have significant advantages. 5) Supply chain complexity - Managing logistics across multiple countries increases operational risk. I recommend developing contingency plans for each of these risk areas."
    }
]


async def seed_workspaces():
    """Seed the database with default workspaces and sample messages"""
    db = get_database()
    if db is None:
        print("ERROR: Database not available for seeding workspaces")
        return False
    
    workspaces_collection = db.workspaces
    messages_collection = db.messages
    users_collection = db.users
    
    try:
        # Clear existing workspaces and messages for clean testing
        existing_workspaces = await workspaces_collection.find({}).to_list(length=None)
        existing_messages = await messages_collection.find({}).to_list(length=None)
        
        if len(existing_workspaces) > 0:
            print(f"INFO: Found {len(existing_workspaces)} existing workspaces. Clearing...")
            await workspaces_collection.delete_many({})
        
        if len(existing_messages) > 0:
            print(f"INFO: Found {len(existing_messages)} existing messages. Clearing...")
            await messages_collection.delete_many({})
        
        # Get user IDs for workspace ownership
        user_emails_to_ids = {}
        users = await users_collection.find({}).to_list(length=None)
        for user in users:
            user_emails_to_ids[user["email"]] = str(user["_id"])
        
        print(f"Found {len(users)} users for workspace assignment")
        
        # Create workspace documents
        created_workspaces = []
        for workspace_data in DEFAULT_WORKSPACES:
            owner_email = workspace_data["owner_email"]
            owner_id = user_emails_to_ids.get(owner_email)
            
            if not owner_id:
                print(f"WARNING: Skipping workspace '{workspace_data['title']}' - owner '{owner_email}' not found")
                continue
            
            now = datetime.utcnow()
            workspace_create = WorkspaceCreate(
                title=workspace_data["title"],
                owner_id=owner_id,  # Required field
                created_at=now,     # Required field
                updated_at=now,     # Required field
                settings=workspace_data["settings"],
                transform=workspace_data["transform"]
            )
            
            # Create workspace document
            workspace_doc = workspace_create.model_dump()
            
            result = await workspaces_collection.insert_one(workspace_doc)
            workspace_id = str(result.inserted_id)
            
            print(f"SUCCESS: Created workspace: '{workspace_data['title']}' (ID: {workspace_id}, Owner: {owner_email})")
            
            created_workspaces.append({
                "id": workspace_id,
                "title": workspace_data["title"],
                "owner_id": owner_id
            })
        
        # Create sample messages in ALL workspaces for testing Add to Map
        for test_workspace in created_workspaces:
            workspace_id = test_workspace["id"]
            owner_id = test_workspace["owner_id"]
            
            print(f"\nCreating sample messages in workspace '{test_workspace['title']}'...")
            
            for i, message_data in enumerate(SAMPLE_MESSAGES):
                message_create = MessageCreate(
                    workspace_id=workspace_id,  # Keep as string - PyObjectId expects string
                    author=message_data["author"],
                    type=message_data["type"],
                    content=message_data["content"],
                    created_at=datetime.utcnow(),
                    added_to_map=False
                )
                
                message_doc = message_create.model_dump()
                result = await messages_collection.insert_one(message_doc)
                message_id = str(result.inserted_id)
                
                print(f"   SUCCESS: Created {message_data['type']} message: {message_id} ({message_data['content'][:50]}...)")
        
        print(f"\nSUCCESS: Successfully seeded {len(created_workspaces)} workspaces with sample data")
        print(f"Test workspace ID: {created_workspaces[0]['id'] if created_workspaces else 'None'}")
        print(f"Test user ID: {created_workspaces[0]['owner_id'] if created_workspaces else 'None'}")
        
        return True
        
    except Exception as e:
        print(f"ERROR: Failed to seed workspaces: {e}")
        import traceback
        traceback.print_exc()
        return False


async def get_test_workspace_info():
    """Get test workspace information for debugging"""
    db = get_database()
    if db is None:
        return None
    
    workspaces = await db.workspaces.find({}).to_list(length=1)
    if workspaces:
        workspace = workspaces[0]
        messages = await db.messages.find({"workspace_id": str(workspace["_id"])}).to_list(length=None)
        
        return {
            "workspace_id": str(workspace["_id"]),
            "workspace_title": workspace["title"],
            "owner_id": workspace["owner_id"],
            "message_count": len(messages),
            "messages": [
                {
                    "id": str(msg["_id"]),
                    "type": msg["type"],
                    "author": msg["author"],
                    "added_to_map": msg.get("added_to_map", False),
                    "content": msg["content"][:100] + "..." if len(msg["content"]) > 100 else msg["content"]
                }
                for msg in messages
            ]
        }
    
    return None


if __name__ == "__main__":
    # For testing the seeding function
    async def main():
        from database_memory import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        
        # Seed users first
        from utils.seed_users import seed_users
        await seed_users()
        
        # Then seed workspaces
        await seed_workspaces()
        
        # Show test info
        test_info = await get_test_workspace_info()
        if test_info:
            print(f"\nTEST WORKSPACE INFO:")
            print(f"   Workspace ID: {test_info['workspace_id']}")
            print(f"   Title: {test_info['workspace_title']}")
            print(f"   Owner ID: {test_info['owner_id']}")
            print(f"   Messages: {test_info['message_count']}")
            for msg in test_info['messages']:
                print(f"     - {msg['type']}: {msg['content']}")
        
        await close_mongo_connection()
    
    asyncio.run(main())

async def ensure_all_workspaces_have_agents(db):
    """Ensure all existing workspaces have active agents configured"""
    try:
        workspaces_collection = db.workspaces
        
        # Find all workspaces without active agents
        workspaces_cursor = workspaces_collection.find({})
        workspaces = await workspaces_cursor.to_list(length=None)
        
        fixed_count = 0
        for workspace in workspaces:
            settings = workspace.get('settings', {})
            active_agents = settings.get('active_agents', [])
            
            if not active_agents:
                # Add active agents to this workspace
                await workspaces_collection.update_one(
                    {"_id": workspace["_id"]},
                    {
                        "$set": {
                            "settings.active_agents": ["strategist"]
                        }
                    }
                )
                fixed_count += 1
                print(f"✅ Added active agents to workspace {workspace['_id']}")
        
        if fixed_count > 0:
            print(f"🎉 Fixed {fixed_count} workspaces to have active agents!")
        else:
            print("✅ All workspaces already have active agents configured")
            
    except Exception as e:
        print(f"❌ Error ensuring workspaces have agents: {e}")
