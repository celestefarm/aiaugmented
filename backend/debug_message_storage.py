#!/usr/bin/env python3
"""
Debug script to check how messages are actually stored in the database
"""

import asyncio
from database_memory import get_database
from bson import ObjectId

async def check_message_storage():
    db = get_database()
    # Find a recent message
    messages = await db.messages.find({}).sort('_id', -1).limit(5).to_list(length=5)
    print('Recent messages:')
    for msg in messages:
        print(f'  ID: {msg["_id"]}')
        print(f'  workspace_id: {msg.get("workspace_id")} (type: {type(msg.get("workspace_id"))})')
        print(f'  author: {msg.get("author")}')
        print(f'  type: {msg.get("type")}')
        print('  ---')
    
    # Also check if we can find messages with different query formats
    if messages:
        test_workspace_id = messages[0].get("workspace_id")
        print(f'\nTesting queries with workspace_id: {test_workspace_id}')
        
        # Test string query
        string_results = await db.messages.find({"workspace_id": test_workspace_id}).to_list(length=10)
        print(f'String query results: {len(string_results)} messages')
        
        # Test ObjectId query (if workspace_id is a string)
        if isinstance(test_workspace_id, str) and ObjectId.is_valid(test_workspace_id):
            objectid_results = await db.messages.find({"workspace_id": ObjectId(test_workspace_id)}).to_list(length=10)
            print(f'ObjectId query results: {len(objectid_results)} messages')
        
        # Test $or query
        or_results = await db.messages.find({
            "$or": [
                {"workspace_id": test_workspace_id},
                {"workspace_id": ObjectId(test_workspace_id) if isinstance(test_workspace_id, str) and ObjectId.is_valid(test_workspace_id) else None}
            ]
        }).to_list(length=10)
        print(f'$or query results: {len(or_results)} messages')

if __name__ == "__main__":
    asyncio.run(check_message_storage())