#!/usr/bin/env python3
"""
Direct test of the node update fix by simulating the exact error scenario.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from backend.models.node import NodeInDB
import os

async def test_objectid_conversion():
    """Test ObjectId to string conversion in NodeInDB model"""
    
    print("=== Testing ObjectId Conversion Fix ===")
    
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.wild_beaver_climb
    
    try:
        # Find a node in the database
        node_doc = await db.nodes.find_one()
        
        if not node_doc:
            print("❌ No nodes found in database")
            return False
        
        print(f"Found node: {node_doc['_id']}")
        print(f"_id type: {type(node_doc['_id'])}")
        print(f"workspace_id type: {type(node_doc.get('workspace_id'))}")
        
        # Test 1: Try creating NodeInDB without conversion (this should fail)
        print("\n1. Testing without ObjectId conversion (should fail)...")
        try:
            node_in_db = NodeInDB(**node_doc)
            print("❌ Unexpected success - this should have failed!")
            return False
        except Exception as e:
            print(f"✅ Expected failure: {e}")
        
        # Test 2: Try creating NodeInDB with conversion (this should work)
        print("\n2. Testing with ObjectId conversion (should work)...")
        try:
            # Apply the same fix we implemented
            converted_doc = node_doc.copy()
            converted_doc['_id'] = str(converted_doc['_id'])
            if isinstance(converted_doc.get('workspace_id'), ObjectId):
                converted_doc['workspace_id'] = str(converted_doc['workspace_id'])
            
            node_in_db = NodeInDB(**converted_doc)
            print(f"✅ Success! Created NodeInDB with id: {node_in_db.id}")
            print(f"   workspace_id: {node_in_db.workspace_id}")
            return True
            
        except Exception as e:
            print(f"❌ Unexpected failure: {e}")
            return False
            
    finally:
        client.close()

if __name__ == "__main__":
    success = asyncio.run(test_objectid_conversion())
    if success:
        print("\n🎉 ObjectId conversion fix is working correctly!")
    else:
        print("\n💥 ObjectId conversion is still failing")