from database_memory import get_database
from models.node import NodeCreate, NodeInDB
from datetime import datetime
from bson import ObjectId
from typing import List
import asyncio


# Default nodes for testing/development - using the specific IDs from the failing test case
DEFAULT_NODES = [
    {
        "_id": ObjectId("68d57ad646ea8e53f748ef04"),  # Specific node ID from failing test
        "workspace_id": "68d579e446ea8e53f748eef5",  # Specific workspace ID from failing test
        "title": "Strategic Market Analysis",
        "description": "Analysis of European market expansion opportunities and risks",
        "type": "analysis",
        "x": 100.0,  # Canvas X coordinate
        "y": 100.0,  # Canvas Y coordinate
        "confidence": 85,
        "feasibility": "high",
        "source_agent": "strategist"
    },
    {
        "_id": ObjectId("68d57ad646ea8e53f748ef05"),  # Additional test node
        "workspace_id": "68d579e446ea8e53f748eef5",  # Same workspace
        "title": "Risk Assessment",
        "description": "Key risks for European expansion including regulatory, currency, and competitive factors",
        "type": "risk-analysis",
        "x": 350.0,  # Canvas X coordinate
        "y": 100.0,  # Canvas Y coordinate
        "confidence": 75,
        "feasibility": "medium",
        "source_agent": "risk-agent"
    },
    {
        "_id": ObjectId("68d57ad646ea8e53f748ef06"),  # Additional test node
        "workspace_id": "68d579e446ea8e53f748eef5",  # Same workspace
        "title": "Implementation Plan",
        "description": "Phased approach to European market entry with budget allocation and timeline",
        "type": "action-plan",
        "x": 225.0,  # Canvas X coordinate
        "y": 300.0,  # Canvas Y coordinate
        "confidence": 90,
        "feasibility": "high",
        "source_agent": "execution-agent"
    }
]


async def seed_nodes():
    """Seed the database with default nodes for testing"""
    db = get_database()
    if db is None:
        print("❌ Database not available for seeding nodes")
        return False
    
    nodes_collection = db.nodes
    workspaces_collection = db.workspaces
    
    try:
        # Check if nodes already exist
        existing_count = await nodes_collection.count_documents({})
        if existing_count > 0:
            print(f"ℹ️  Nodes collection already has {existing_count} documents. Clearing and re-seeding...")
            await nodes_collection.delete_many({})
        else:
            print("ℹ️  No existing nodes found. Proceeding with fresh seeding...")
        
        # Verify that the target workspace exists
        target_workspace_id = "68d579e446ea8e53f748eef5"
        workspace_exists = await workspaces_collection.find_one({"_id": ObjectId(target_workspace_id)})
        
        if not workspace_exists:
            print(f"⚠️  Target workspace {target_workspace_id} does not exist. Creating it first...")
            # Create the specific workspace needed for testing
            from utils.seed_users import get_user_by_email
            celeste_user = await get_user_by_email("celeste.fcp@gmail.com")
            
            if celeste_user:
                workspace_doc = {
                    "_id": ObjectId(target_workspace_id),
                    "title": "Node Deletion Test Workspace",
                    "owner_id": str(celeste_user.id),
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow(),
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
                }
                await workspaces_collection.insert_one(workspace_doc)
                print(f"✅ Created target workspace: {target_workspace_id}")
            else:
                print("❌ Cannot create workspace - Celeste user not found")
                return False
        
        # Create node documents
        node_docs = []
        for node_data in DEFAULT_NODES:
            # Create the node document with the specific ObjectId
            node_doc = {
                "_id": node_data["_id"],
                "workspace_id": node_data["workspace_id"],
                "title": node_data["title"],
                "description": node_data["description"],
                "type": node_data["type"],
                "x": node_data["x"],
                "y": node_data["y"],
                "confidence": node_data.get("confidence"),
                "feasibility": node_data.get("feasibility"),
                "source_agent": node_data.get("source_agent"),
                "summarized_titles": {},
                "key_message": None,
                "keynote_points": [],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            node_docs.append(node_doc)
        
        # Insert all nodes
        for node_doc in node_docs:
            result = await nodes_collection.insert_one(node_doc)
            print(f"✅ Created node: '{node_doc['title']}' (ID: {node_doc['_id']}, Workspace: {node_doc['workspace_id']})")
        
        print(f"✅ Successfully seeded {len(node_docs)} default nodes")
        
        # Create indexes for better performance
        try:
            await nodes_collection.create_index("workspace_id")
            await nodes_collection.create_index("type")
            print("✅ Created indexes for nodes collection")
        except Exception as e:
            print(f"ℹ️  Index creation skipped (in-memory database): {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ Failed to seed nodes: {e}")
        import traceback
        traceback.print_exc()
        return False


async def get_all_nodes() -> List[dict]:
    """Get all nodes from database"""
    db = get_database()
    if db is None:
        return []
    
    nodes_collection = db.nodes
    node_docs = await nodes_collection.find({}).to_list(length=None)
    
    # Convert ObjectId to string for JSON compatibility
    for node_doc in node_docs:
        if node_doc and "_id" in node_doc:
            node_doc["_id"] = str(node_doc["_id"])
    
    return node_docs


async def get_nodes_by_workspace(workspace_id: str) -> List[dict]:
    """Get all nodes for a specific workspace"""
    db = get_database()
    if db is None:
        return []
    
    nodes_collection = db.nodes
    node_docs = await nodes_collection.find({"workspace_id": workspace_id}).to_list(length=None)
    
    # Convert ObjectId to string for JSON compatibility
    for node_doc in node_docs:
        if node_doc and "_id" in node_doc:
            node_doc["_id"] = str(node_doc["_id"])
    
    return node_docs


async def get_test_node_info():
    """Get test node information for debugging"""
    db = get_database()
    if db is None:
        return None
    
    target_workspace_id = "68d579e446ea8e53f748eef5"
    target_node_id = "68d57ad646ea8e53f748ef04"
    
    # Check workspace exists
    workspace = await db.workspaces.find_one({"_id": ObjectId(target_workspace_id)})
    
    # Check node exists
    node = await db.nodes.find_one({"_id": ObjectId(target_node_id)})
    
    # Get all nodes in the workspace
    workspace_nodes = await get_nodes_by_workspace(target_workspace_id)
    
    return {
        "target_workspace_id": target_workspace_id,
        "target_node_id": target_node_id,
        "workspace_exists": workspace is not None,
        "node_exists": node is not None,
        "workspace_title": workspace.get("title", "N/A") if workspace else "N/A",
        "node_title": node.get("title", "N/A") if node else "N/A",
        "total_nodes_in_workspace": len(workspace_nodes),
        "all_workspace_nodes": [
            {
                "id": node["_id"],
                "title": node["title"],
                "type": node["type"]
            }
            for node in workspace_nodes
        ]
    }


if __name__ == "__main__":
    # For testing the seeding function
    async def main():
        from database_memory import connect_to_mongo, close_mongo_connection
        await connect_to_mongo()
        
        # Seed users first (required for workspace creation)
        from utils.seed_users import seed_users
        await seed_users()
        
        # Seed workspaces
        from utils.seed_workspaces import seed_workspaces
        await seed_workspaces()
        
        # Then seed nodes
        await seed_nodes()
        
        # Show test info
        test_info = await get_test_node_info()
        if test_info:
            print(f"\n🧪 TEST NODE INFO:")
            print(f"   Target Workspace ID: {test_info['target_workspace_id']}")
            print(f"   Target Node ID: {test_info['target_node_id']}")
            print(f"   Workspace Exists: {test_info['workspace_exists']}")
            print(f"   Node Exists: {test_info['node_exists']}")
            print(f"   Workspace Title: {test_info['workspace_title']}")
            print(f"   Node Title: {test_info['node_title']}")
            print(f"   Total Nodes in Workspace: {test_info['total_nodes_in_workspace']}")
            for node in test_info['all_workspace_nodes']:
                print(f"     - {node['type']}: {node['title']} (ID: {node['id']})")
        
        await close_mongo_connection()
    
    asyncio.run(main())