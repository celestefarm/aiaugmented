#!/usr/bin/env python3
"""
Debug script to check workspace_id data consistency in the database
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def debug_data_consistency():
    """Check data consistency in the database"""
    
    print("🔍 Debugging Workspace Data Consistency")
    print("=" * 60)
    
    # Connect to MongoDB
    mongodb_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "agentic_boardroom")
    
    client = AsyncIOMotorClient(mongodb_url)
    database = client[database_name]
    
    try:
        # Check workspaces collection
        print("\n📋 WORKSPACES:")
        workspaces = await database.workspaces.find({}).to_list(length=10)
        for ws in workspaces:
            print(f"  - ID: {ws['_id']} (type: {type(ws['_id'])})")
            print(f"    Owner: {ws.get('owner_id')} (type: {type(ws.get('owner_id'))})")
        
        if not workspaces:
            print("  ❌ No workspaces found!")
            return
        
        # Use the first workspace for testing
        test_workspace = workspaces[0]
        workspace_id_str = str(test_workspace['_id'])
        workspace_id_obj = test_workspace['_id']
        
        print(f"\n🧪 Testing with workspace: {workspace_id_str}")
        
        # Check nodes collection
        print("\n📦 NODES:")
        print(f"  Searching with string: '{workspace_id_str}'")
        nodes_str = await database.nodes.find({"workspace_id": workspace_id_str}).to_list(length=10)
        print(f"  Found {len(nodes_str)} nodes with string workspace_id")
        
        print(f"  Searching with ObjectId: {workspace_id_obj}")
        nodes_obj = await database.nodes.find({"workspace_id": workspace_id_obj}).to_list(length=10)
        print(f"  Found {len(nodes_obj)} nodes with ObjectId workspace_id")
        
        # Show sample nodes
        all_nodes = nodes_str + nodes_obj
        for i, node in enumerate(all_nodes[:5]):
            print(f"    Node {i+1}: {node['_id']}")
            print(f"      workspace_id: {node['workspace_id']} (type: {type(node['workspace_id'])})")
            print(f"      title: {node.get('title', 'No title')}")
        
        # Check edges collection
        print("\n🔗 EDGES:")
        print(f"  Searching with string: '{workspace_id_str}'")
        edges_str = await database.edges.find({"workspace_id": workspace_id_str}).to_list(length=10)
        print(f"  Found {len(edges_str)} edges with string workspace_id")
        
        print(f"  Searching with ObjectId: {workspace_id_obj}")
        edges_obj = await database.edges.find({"workspace_id": workspace_id_obj}).to_list(length=10)
        print(f"  Found {len(edges_obj)} edges with ObjectId workspace_id")
        
        # Check messages collection
        print("\n💬 MESSAGES:")
        print(f"  Searching with string: '{workspace_id_str}'")
        messages_str = await database.messages.find({"workspace_id": workspace_id_str}).to_list(length=10)
        print(f"  Found {len(messages_str)} messages with string workspace_id")
        
        print(f"  Searching with ObjectId: {workspace_id_obj}")
        messages_obj = await database.messages.find({"workspace_id": workspace_id_obj}).to_list(length=10)
        print(f"  Found {len(messages_obj)} messages with ObjectId workspace_id")
        
        # Diagnosis
        print("\n🎯 DIAGNOSIS:")
        if len(nodes_str) > 0 and len(nodes_obj) == 0:
            print("✅ Nodes use STRING workspace_id consistently")
        elif len(nodes_obj) > 0 and len(nodes_str) == 0:
            print("✅ Nodes use OBJECTID workspace_id consistently")
        elif len(nodes_str) > 0 and len(nodes_obj) > 0:
            print("❌ INCONSISTENT: Nodes use BOTH string and ObjectId workspace_id")
        else:
            print("⚠️  No nodes found to analyze")
        
        if len(edges_str) > 0 and len(edges_obj) == 0:
            print("✅ Edges use STRING workspace_id consistently")
        elif len(edges_obj) > 0 and len(edges_str) == 0:
            print("✅ Edges use OBJECTID workspace_id consistently")
        elif len(edges_str) > 0 and len(edges_obj) > 0:
            print("❌ INCONSISTENT: Edges use BOTH string and ObjectId workspace_id")
        else:
            print("⚠️  No edges found to analyze")
        
        # Recommendations
        print("\n💡 RECOMMENDATIONS:")
        if len(nodes_str) > 0:
            print("1. Backend should use STRING workspace_id for all queries")
            print("2. Fix edge deletion query to use string instead of ObjectId")
        elif len(nodes_obj) > 0:
            print("1. Backend should use OBJECTID workspace_id for all queries")
            print("2. Fix node queries to use ObjectId instead of string")
        
        print("\n🔧 NEXT STEPS:")
        print("1. Update backend queries to use consistent data type")
        print("2. Test node deletion after fixing the queries")
        print("3. Verify the remove-from-map functionality works")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(debug_data_consistency())