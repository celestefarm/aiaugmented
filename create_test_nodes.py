#!/usr/bin/env python3

import asyncio
import sys
import os
from datetime import datetime
from bson import ObjectId

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database import connect_to_mongo

async def create_test_nodes():
    """Create test nodes for drag functionality testing"""
    
    # Connect to database
    db = await connect_to_mongo()
    
    if db is None:
        print("❌ Failed to connect to database")
        return []
    
    # Use the most recent workspace ID from the browser logs
    workspace_id = "68ced31a985a8a47f4969d8f"
    
    print(f"Creating test nodes for workspace: {workspace_id}")
    
    # Create test nodes at different positions
    test_nodes = [
        {
            "title": "Test Node 1",
            "description": "This is the first test node for drag testing",
            "type": "human",
            "x": 100,
            "y": 150,
            "workspace_id": workspace_id
        },
        {
            "title": "Test Node 2",
            "description": "This is the second test node for drag testing",
            "type": "human",
            "x": 300,
            "y": 200,
            "workspace_id": workspace_id
        },
        {
            "title": "Test Node 3",
            "description": "This is the third test node for drag testing",
            "type": "human",
            "x": 500,
            "y": 100,
            "workspace_id": workspace_id
        }
    ]
    
    created_nodes = []
    
    for node_data in test_nodes:
        # Create node document
        node_doc = {
            "_id": ObjectId(),
            "title": node_data["title"],
            "description": node_data["description"],
            "type": node_data["type"],
            "x": node_data["x"],
            "y": node_data["y"],
            "workspace_id": node_data["workspace_id"],
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "confidence": None,
            "feasibility": None,
            "source_agent": None,
            "summarized_titles": {},
            "key_message": None,
            "keynote_points": []
        }
        
        # Insert into database
        result = await db.nodes.insert_one(node_doc)
        
        if result.inserted_id:
            created_nodes.append({
                "id": str(result.inserted_id),
                "title": node_data["title"],
                "x": node_data["x"],
                "y": node_data["y"]
            })
            print(f"✅ Created node: {node_data['title']} at ({node_data['x']}, {node_data['y']})")
        else:
            print(f"❌ Failed to create node: {node_data['title']}")
    
    print(f"\n🎯 Successfully created {len(created_nodes)} test nodes!")
    print("These nodes are now ready for drag testing.")
    
    return created_nodes

if __name__ == "__main__":
    asyncio.run(create_test_nodes())