#!/usr/bin/env python3
"""
Database Data Consistency Diagnostic Script

This script connects to the in-memory database used by the application
and performs comprehensive checks on node and workspace relationships.

Specific focus on the failing case:
- workspace_id: 68d579e446ea8e53f748eef5
- node_id: 68d57ad646ea8e53f748ef04
"""

import asyncio
import sys
import os
from datetime import datetime
from bson import ObjectId
from typing import Dict, List, Any, Optional

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Import the in-memory database system
from database_memory import connect_to_mongo, get_database, close_mongo_connection

class DataConsistencyDiagnostic:
    """Comprehensive data consistency diagnostic tool"""
    
    def __init__(self):
        self.database = None
        self.target_workspace_id = "68d579e446ea8e53f748eef5"
        self.target_node_id = "68d57ad646ea8e53f748ef04"
        
    async def initialize(self):
        """Initialize database connection"""
        print("🔍 INITIALIZING DATA CONSISTENCY DIAGNOSTIC")
        print("=" * 60)
        
        # Connect to the in-memory database
        self.database = await connect_to_mongo()
        if not self.database:
            raise Exception("Failed to connect to database")
        
        print(f"✅ Connected to in-memory database successfully")
        print(f"🎯 Target workspace_id: {self.target_workspace_id}")
        print(f"🎯 Target node_id: {self.target_node_id}")
        print()
    
    async def check_collections_overview(self):
        """Get overview of all collections and their document counts"""
        print("📊 COLLECTIONS OVERVIEW")
        print("-" * 40)
        
        collections = ['workspaces', 'nodes', 'edges', 'messages', 'users']
        
        for collection_name in collections:
            collection = getattr(self.database, collection_name)
            count = await collection.count_documents({})
            print(f"  {collection_name:12}: {count:4} documents")
        
        print()
    
    async def check_target_workspace(self):
        """Check if the target workspace exists and its properties"""
        print("🏢 TARGET WORKSPACE ANALYSIS")
        print("-" * 40)
        
        # Check with ObjectId format
        workspace_oid = None
        try:
            workspace_oid = ObjectId(self.target_workspace_id)
            workspace_doc = await self.database.workspaces.find_one({"_id": workspace_oid})
            
            if workspace_doc:
                print(f"✅ Workspace found with ObjectId format")
                print(f"   _id: {workspace_doc['_id']} (type: {type(workspace_doc['_id'])})")
                print(f"   owner_id: {workspace_doc.get('owner_id')} (type: {type(workspace_doc.get('owner_id'))})")
                print(f"   name: {workspace_doc.get('name', 'N/A')}")
                print(f"   created_at: {workspace_doc.get('created_at', 'N/A')}")
            else:
                print(f"❌ Workspace NOT found with ObjectId format")
        except Exception as e:
            print(f"❌ Error checking workspace with ObjectId: {e}")
        
        # Check with string format
        workspace_str = await self.database.workspaces.find_one({"_id": self.target_workspace_id})
        if workspace_str:
            print(f"✅ Workspace found with string format")
            print(f"   _id: {workspace_str['_id']} (type: {type(workspace_str['_id'])})")
            print(f"   owner_id: {workspace_str.get('owner_id')} (type: {type(workspace_str.get('owner_id'))})")
        else:
            print(f"❌ Workspace NOT found with string format")
        
        # List all workspaces for reference
        print(f"\n📋 ALL WORKSPACES IN DATABASE:")
        cursor = self.database.workspaces.find({})
        all_workspaces = await cursor.to_list(length=None)
        
        if not all_workspaces:
            print("   No workspaces found in database")
        else:
            for i, ws in enumerate(all_workspaces, 1):
                print(f"   {i}. _id: {ws['_id']} (type: {type(ws['_id'])})")
                print(f"      owner_id: {ws.get('owner_id')} (type: {type(ws.get('owner_id'))})")
                print(f"      name: {ws.get('name', 'N/A')}")
        
        print()
        return workspace_doc or workspace_str
    
    async def check_target_node(self):
        """Check if the target node exists and its properties"""
        print("🔗 TARGET NODE ANALYSIS")
        print("-" * 40)
        
        # Check with ObjectId format
        node_oid = None
        try:
            node_oid = ObjectId(self.target_node_id)
            node_doc = await self.database.nodes.find_one({"_id": node_oid})
            
            if node_doc:
                print(f"✅ Node found with ObjectId format")
                print(f"   _id: {node_doc['_id']} (type: {type(node_doc['_id'])})")
                print(f"   workspace_id: {node_doc.get('workspace_id')} (type: {type(node_doc.get('workspace_id'))})")
                print(f"   title: {node_doc.get('title', 'N/A')}")
                print(f"   type: {node_doc.get('type', 'N/A')}")
                print(f"   created_at: {node_doc.get('created_at', 'N/A')}")
            else:
                print(f"❌ Node NOT found with ObjectId format")
        except Exception as e:
            print(f"❌ Error checking node with ObjectId: {e}")
        
        # Check with string format
        node_str = await self.database.nodes.find_one({"_id": self.target_node_id})
        if node_str:
            print(f"✅ Node found with string format")
            print(f"   _id: {node_str['_id']} (type: {type(node_str['_id'])})")
            print(f"   workspace_id: {node_str.get('workspace_id')} (type: {type(node_str.get('workspace_id'))})")
        else:
            print(f"❌ Node NOT found with string format")
        
        print()
        return node_doc or node_str
    
    async def check_workspace_id_consistency(self):
        """Check workspace_id data type consistency across all nodes"""
        print("🔍 WORKSPACE_ID DATA TYPE CONSISTENCY ANALYSIS")
        print("-" * 50)
        
        cursor = self.database.nodes.find({})
        all_nodes = await cursor.to_list(length=None)
        
        if not all_nodes:
            print("   No nodes found in database")
            print()
            return
        
        # Analyze workspace_id types
        type_counts = {}
        workspace_id_examples = {}
        
        for node in all_nodes:
            workspace_id = node.get('workspace_id')
            workspace_id_type = type(workspace_id).__name__
            
            if workspace_id_type not in type_counts:
                type_counts[workspace_id_type] = 0
                workspace_id_examples[workspace_id_type] = []
            
            type_counts[workspace_id_type] += 1
            
            # Store examples (max 3 per type)
            if len(workspace_id_examples[workspace_id_type]) < 3:
                workspace_id_examples[workspace_id_type].append({
                    'node_id': str(node['_id']),
                    'workspace_id': workspace_id,
                    'title': node.get('title', 'N/A')[:30]
                })
        
        print(f"📊 WORKSPACE_ID TYPE DISTRIBUTION:")
        for data_type, count in type_counts.items():
            print(f"   {data_type:15}: {count:4} nodes")
        
        print(f"\n📋 EXAMPLES BY TYPE:")
        for data_type, examples in workspace_id_examples.items():
            print(f"   {data_type}:")
            for example in examples:
                print(f"     - Node {example['node_id']}: workspace_id={example['workspace_id']}")
                print(f"       Title: {example['title']}")
        
        # Check for our specific target
        print(f"\n🎯 TARGET NODE WORKSPACE_ID CHECK:")
        target_found = False
        for node in all_nodes:
            node_id_str = str(node['_id'])
            if node_id_str == self.target_node_id:
                target_found = True
                workspace_id = node.get('workspace_id')
                print(f"   ✅ Target node found!")
                print(f"   Node ID: {node_id_str}")
                print(f"   workspace_id: {workspace_id} (type: {type(workspace_id).__name__})")
                print(f"   Expected workspace_id: {self.target_workspace_id}")
                print(f"   Match: {str(workspace_id) == self.target_workspace_id}")
                break
        
        if not target_found:
            print(f"   ❌ Target node {self.target_node_id} not found in nodes collection")
        
        print()
    
    async def check_node_workspace_relationships(self):
        """Check relationships between nodes and workspaces"""
        print("🔗 NODE-WORKSPACE RELATIONSHIP ANALYSIS")
        print("-" * 45)
        
        # Get all nodes
        cursor = self.database.nodes.find({})
        all_nodes = await cursor.to_list(length=None)
        
        # Get all workspaces
        cursor = self.database.workspaces.find({})
        all_workspaces = await cursor.to_list(length=None)
        
        # Create workspace lookup
        workspace_lookup = {}
        for ws in all_workspaces:
            ws_id = str(ws['_id'])
            workspace_lookup[ws_id] = ws
        
        print(f"📊 RELATIONSHIP SUMMARY:")
        print(f"   Total nodes: {len(all_nodes)}")
        print(f"   Total workspaces: {len(all_workspaces)}")
        
        # Check each node's workspace relationship
        orphaned_nodes = []
        valid_relationships = 0
        
        for node in all_nodes:
            node_id = str(node['_id'])
            workspace_id = str(node.get('workspace_id', ''))
            
            if workspace_id in workspace_lookup:
                valid_relationships += 1
            else:
                orphaned_nodes.append({
                    'node_id': node_id,
                    'workspace_id': workspace_id,
                    'title': node.get('title', 'N/A')[:30]
                })
        
        print(f"   Valid relationships: {valid_relationships}")
        print(f"   Orphaned nodes: {len(orphaned_nodes)}")
        
        if orphaned_nodes:
            print(f"\n❌ ORPHANED NODES (nodes with invalid workspace_id):")
            for orphan in orphaned_nodes[:5]:  # Show max 5
                print(f"   - Node {orphan['node_id']}")
                print(f"     workspace_id: {orphan['workspace_id']}")
                print(f"     Title: {orphan['title']}")
        
        # Check our specific target relationship
        print(f"\n🎯 TARGET RELATIONSHIP CHECK:")
        target_node_found = False
        for node in all_nodes:
            if str(node['_id']) == self.target_node_id:
                target_node_found = True
                node_workspace_id = str(node.get('workspace_id', ''))
                
                print(f"   Node ID: {self.target_node_id}")
                print(f"   Node's workspace_id: {node_workspace_id}")
                print(f"   Expected workspace_id: {self.target_workspace_id}")
                print(f"   Workspace exists: {self.target_workspace_id in workspace_lookup}")
                print(f"   Relationship valid: {node_workspace_id == self.target_workspace_id and self.target_workspace_id in workspace_lookup}")
                break
        
        if not target_node_found:
            print(f"   ❌ Target node not found")
        
        print()
    
    async def simulate_failing_query(self):
        """Simulate the failing query from the backend to understand the issue"""
        print("🚨 SIMULATING FAILING QUERY")
        print("-" * 35)
        
        print("Testing the exact query that's failing in the backend...")
        
        # This is the query from the delete_node function in nodes.py line 336-339
        try:
            existing_node = await self.database.nodes.find_one({
                "_id": ObjectId(self.target_node_id),
                "workspace_id": self.target_workspace_id  # String format as used in backend
            })
            
            if existing_node:
                print("✅ Query SUCCESS - Node found with backend query logic")
                print(f"   Node ID: {existing_node['_id']}")
                print(f"   workspace_id: {existing_node.get('workspace_id')}")
                print(f"   Title: {existing_node.get('title', 'N/A')}")
            else:
                print("❌ Query FAILED - Node not found with backend query logic")
                print("   This explains why the delete operation is failing!")
                
                # Let's try alternative queries to understand why
                print("\n🔍 TRYING ALTERNATIVE QUERIES:")
                
                # Try with just node ID
                node_only = await self.database.nodes.find_one({"_id": ObjectId(self.target_node_id)})
                if node_only:
                    print(f"   ✅ Node exists with ID only")
                    print(f"      workspace_id: {node_only.get('workspace_id')} (type: {type(node_only.get('workspace_id'))})")
                else:
                    print(f"   ❌ Node doesn't exist at all")
                
                # Try with string node ID
                node_str = await self.database.nodes.find_one({"_id": self.target_node_id})
                if node_str:
                    print(f"   ✅ Node exists with string ID")
                    print(f"      workspace_id: {node_str.get('workspace_id')} (type: {type(node_str.get('workspace_id'))})")
                else:
                    print(f"   ❌ Node doesn't exist with string ID")
        
        except Exception as e:
            print(f"❌ Error executing query: {e}")
        
        print()
    
    async def generate_summary_report(self):
        """Generate a comprehensive summary of findings"""
        print("📋 DIAGNOSTIC SUMMARY REPORT")
        print("=" * 40)
        
        # Re-check key elements for summary
        workspace_exists = False
        node_exists = False
        relationship_valid = False
        
        try:
            # Check workspace
            workspace_doc = await self.database.workspaces.find_one({"_id": ObjectId(self.target_workspace_id)})
            workspace_exists = workspace_doc is not None
            
            # Check node
            node_doc = await self.database.nodes.find_one({"_id": ObjectId(self.target_node_id)})
            node_exists = node_doc is not None
            
            # Check relationship
            if node_exists and workspace_exists:
                node_workspace_id = str(node_doc.get('workspace_id', ''))
                relationship_valid = node_workspace_id == self.target_workspace_id
            
        except Exception as e:
            print(f"Error in summary check: {e}")
        
        print(f"🎯 TARGET CASE ANALYSIS:")
        print(f"   Workspace {self.target_workspace_id} exists: {'✅ YES' if workspace_exists else '❌ NO'}")
        print(f"   Node {self.target_node_id} exists: {'✅ YES' if node_exists else '❌ NO'}")
        print(f"   Node-Workspace relationship valid: {'✅ YES' if relationship_valid else '❌ NO'}")
        
        print(f"\n🔍 ROOT CAUSE ANALYSIS:")
        if not workspace_exists:
            print("   ❌ PRIMARY ISSUE: Target workspace does not exist")
            print("      - This could be due to test data not being seeded properly")
            print("      - Or the workspace ID in the test is incorrect")
        elif not node_exists:
            print("   ❌ PRIMARY ISSUE: Target node does not exist")
            print("      - This could be due to test data not being seeded properly")
            print("      - Or the node ID in the test is incorrect")
        elif not relationship_valid:
            print("   ❌ PRIMARY ISSUE: Node exists but belongs to different workspace")
            print("      - Data consistency issue between node and workspace")
        else:
            print("   ✅ Data integrity appears correct")
            print("      - Issue likely in query logic or data type handling")
        
        print(f"\n💡 RECOMMENDATIONS:")
        if not workspace_exists or not node_exists:
            print("   1. Check test data seeding - ensure workspaces and nodes are created")
            print("   2. Verify the test is using correct IDs that exist in the database")
            print("   3. Check if the in-memory database is being reset between tests")
        else:
            print("   1. Review query logic in backend for data type consistency")
            print("   2. Ensure ObjectId vs string handling is consistent")
            print("   3. Add more detailed logging to backend queries")
        
        print()
    
    async def cleanup(self):
        """Clean up database connection"""
        await close_mongo_connection()
        print("🔌 Database connection closed")

async def main():
    """Main diagnostic function"""
    diagnostic = DataConsistencyDiagnostic()
    
    try:
        await diagnostic.initialize()
        await diagnostic.check_collections_overview()
        await diagnostic.check_target_workspace()
        await diagnostic.check_target_node()
        await diagnostic.check_workspace_id_consistency()
        await diagnostic.check_node_workspace_relationships()
        await diagnostic.simulate_failing_query()
        await diagnostic.generate_summary_report()
        
    except Exception as e:
        print(f"❌ Diagnostic failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        await diagnostic.cleanup()

if __name__ == "__main__":
    print("🪲 DATA CONSISTENCY DIAGNOSTIC TOOL")
    print("=" * 60)
    print("This tool analyzes the current state of node and workspace")
    print("relationships in the in-memory database to identify data")
    print("consistency issues that may be causing query failures.")
    print("=" * 60)
    print()
    
    asyncio.run(main())