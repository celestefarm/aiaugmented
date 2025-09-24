#!/usr/bin/env python3
"""
Debug script to test Add to Map functionality with enhanced logging
"""

import asyncio
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from database_memory import get_database, connect_to_mongo
from bson import ObjectId
from datetime import datetime
import json

async def debug_add_to_map():
    """Debug the Add to Map functionality step by step"""
    
    print("=== ADD TO MAP DEBUG SCRIPT ===")
    
    # Initialize database connection
    database = await connect_to_mongo()
    if not database:
        print("❌ Failed to connect to database")
        return
    
    # Get current test workspace ID from the seeded data
    workspace_id = "68d3bbad535795a8e17524ea"  # From backend logs
    user_id = "68d3bbad535795a8e17524e7"       # From backend logs
    
    print(f"Testing with workspace_id: {workspace_id}")
    print(f"Testing with user_id: {user_id}")
    
    # 1. Check if workspace exists
    print("\n=== STEP 1: WORKSPACE VERIFICATION ===")
    workspace_doc = await database.workspaces.find_one({
        "_id": ObjectId(workspace_id),
        "owner_id": user_id
    })
    
    if workspace_doc:
        print("✅ Workspace found")
        print(f"   Title: {workspace_doc.get('title', 'NO_TITLE')}")
        print(f"   Owner: {workspace_doc.get('owner_id', 'NO_OWNER')}")
        print(f"   Settings: {workspace_doc.get('settings', {})}")
    else:
        print("❌ Workspace NOT found")
        return
    
    # 2. Check messages in workspace
    print("\n=== STEP 2: MESSAGES VERIFICATION ===")
    messages_cursor = database.messages.find({
        "$or": [
            {"workspace_id": ObjectId(workspace_id)},
            {"workspace_id": workspace_id}
        ]
    }).sort("created_at", -1).limit(5)
    
    messages = await messages_cursor.to_list(length=5)
    print(f"Found {len(messages)} recent messages:")
    
    test_message_id = None
    for i, msg in enumerate(messages):
        print(f"   Message {i+1}:")
        print(f"     ID: {msg['_id']} (type: {type(msg['_id'])})")
        print(f"     Workspace ID: {msg.get('workspace_id')} (type: {type(msg.get('workspace_id'))})")
        print(f"     Type: {msg.get('type')}")
        print(f"     Author: {msg.get('author')}")
        print(f"     Added to map: {msg.get('added_to_map', 'NOT_SET')}")
        print(f"     Content: {msg.get('content', '')[:50]}...")
        
        # Use first AI message that hasn't been added to map
        if msg.get('type') == 'ai' and not msg.get('added_to_map', False):
            test_message_id = str(msg['_id'])
            print(f"     >>> SELECTED FOR TESTING")
    
    if not test_message_id:
        print("❌ No suitable AI message found for testing")
        return
    
    print(f"\nUsing message ID for testing: {test_message_id}")
    
    # 3. Test the add to map process step by step
    print("\n=== STEP 3: ADD TO MAP SIMULATION ===")
    
    # 3a. Verify message exists and can be updated
    print("3a. Message verification...")
    target_message = await database.messages.find_one({
        "_id": ObjectId(test_message_id),
        "workspace_id": workspace_id
    })
    
    if target_message:
        print("✅ Target message found")
        print(f"   Current added_to_map: {target_message.get('added_to_map', 'NOT_SET')}")
    else:
        print("❌ Target message NOT found")
        return
    
    # 3b. Test message update
    print("3b. Testing message update...")
    try:
        update_result = await database.messages.update_one(
            {
                "_id": ObjectId(test_message_id),
                "workspace_id": workspace_id
            },
            {
                "$set": {"added_to_map": True}
            }
        )
        
        matched_count = getattr(update_result, 'matched_count', 0)
        modified_count = getattr(update_result, 'modified_count', 0)
        
        print(f"   Update result: matched={matched_count}, modified={modified_count}")
        
        if modified_count > 0:
            print("✅ Message update successful")
        else:
            print("❌ Message update failed")
            return
            
    except Exception as e:
        print(f"❌ Message update error: {e}")
        return
    
    # 3c. Test node creation with proper type handling
    print("3c. Testing node creation...")
    try:
        # Calculate position
        existing_nodes = await database.nodes.find({
            "$or": [
                {"workspace_id": workspace_id},
                {"workspace_id": ObjectId(workspace_id)}
            ]
        }).to_list(length=None)
        
        print(f"   Found {len(existing_nodes)} existing nodes")
        
        # Simple positioning
        x_position = 400 + len(existing_nodes) * 50
        y_position = 300 + len(existing_nodes) * 50
        
        print(f"   Calculated position: x={x_position}, y={y_position}")
        
        # Create node data - CRITICAL: Handle type conversion properly
        now = datetime.utcnow()
        node_data = {
            "workspace_id": workspace_id,  # Keep as string
            "title": f"From Chat: {target_message['content'][:50]}...",
            "description": target_message["content"],
            "type": "ai" if target_message["type"] == "ai" else "human",
            "x": x_position,
            "y": y_position,
            "confidence": None,
            "feasibility": None,
            "source_agent": target_message["author"] if target_message["type"] == "ai" else None,
            "created_at": now,
            "updated_at": now
        }
        
        print(f"   Node data prepared:")
        print(f"     workspace_id: {node_data['workspace_id']} (type: {type(node_data['workspace_id'])})")
        print(f"     title: {node_data['title']}")
        print(f"     type: {node_data['type']}")
        
        # Insert node
        node_result = await database.nodes.insert_one(node_data)
        node_id = str(node_result.inserted_id)
        
        print(f"✅ Node created successfully with ID: {node_id}")
        
        # Verify node was created
        created_node = await database.nodes.find_one({"_id": ObjectId(node_id)})
        if created_node:
            print(f"✅ Node verification successful")
            print(f"   Node workspace_id: {created_node.get('workspace_id')} (type: {type(created_node.get('workspace_id'))})")
            print(f"   Node title: {created_node.get('title')}")
        else:
            print(f"❌ Node verification failed")
            
    except Exception as e:
        print(f"❌ Node creation error: {e}")
        print(f"   Error type: {type(e)}")
        import traceback
        traceback.print_exc()
        return
    
    # 4. Test nodes API endpoint
    print("\n=== STEP 4: NODES API VERIFICATION ===")
    try:
        # Test both query formats
        string_query_nodes = await database.nodes.find({"workspace_id": workspace_id}).to_list(length=None)
        objectid_query_nodes = await database.nodes.find({"workspace_id": ObjectId(workspace_id)}).to_list(length=None)
        or_query_nodes = await database.nodes.find({
            "$or": [
                {"workspace_id": workspace_id},
                {"workspace_id": ObjectId(workspace_id)}
            ]
        }).to_list(length=None)
        
        print(f"String query found: {len(string_query_nodes)} nodes")
        print(f"ObjectId query found: {len(objectid_query_nodes)} nodes")
        print(f"$or query found: {len(or_query_nodes)} nodes")
        
        if len(or_query_nodes) > 0:
            print("✅ Nodes API should work correctly")
            print("Recent nodes:")
            for node in or_query_nodes[-3:]:  # Show last 3 nodes
                print(f"   - ID: {node['_id']}, Title: {node.get('title', 'NO_TITLE')[:30]}...")
        else:
            print("❌ No nodes found - API will return empty")
            
    except Exception as e:
        print(f"❌ Nodes API test error: {e}")
    
    print("\n=== DEBUG COMPLETE ===")
    print("Check the results above to identify the root cause.")

if __name__ == "__main__":
    asyncio.run(debug_add_to_map())