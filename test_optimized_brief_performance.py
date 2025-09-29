#!/usr/bin/env python3
"""
Quick performance test for the optimized Last Mile Brief generation
"""

import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword123"

def authenticate():
    """Authenticate and get access token"""
    print("🔐 Authenticating...")
    response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code == 200:
        token_data = response.json()
        print("✅ Authentication successful")
        return token_data["access_token"]
    else:
        print(f"❌ Authentication failed: {response.status_code} - {response.text}")
        return None

def create_test_workspace(token):
    """Create a test workspace"""
    print("🏗️ Creating test workspace...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(f"{BASE_URL}/workspaces", 
        headers=headers,
        json={"title": f"Performance Test Workspace {datetime.now().strftime('%H:%M:%S')}"})
    
    if response.status_code == 200:
        workspace = response.json()
        print(f"✅ Workspace created: {workspace['id']}")
        return workspace["id"]
    else:
        print(f"❌ Workspace creation failed: {response.status_code} - {response.text}")
        return None

def create_test_nodes(token, workspace_id, count=50):
    """Create test nodes for performance testing"""
    print(f"📝 Creating {count} test nodes...")
    headers = {"Authorization": f"Bearer {token}"}
    
    node_ids = []
    for i in range(count):
        node_data = {
            "title": f"Test Node {i+1}",
            "description": f"This is test node {i+1} with some description content for performance testing. " * 3,
            "type": ["human", "ai", "decision", "risk", "dependency"][i % 5],
            "x": (i % 10) * 100,
            "y": (i // 10) * 100,
            "confidence": 75 + (i % 25),
            "feasibility": ["high", "medium", "low"][i % 3]
        }
        
        response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/nodes",
            headers=headers, json=node_data)
        
        if response.status_code == 200:
            node = response.json()
            node_ids.append(node["id"])
        else:
            print(f"❌ Failed to create node {i+1}: {response.status_code}")
    
    print(f"✅ Created {len(node_ids)} nodes")
    return node_ids

def create_test_edges(token, workspace_id, node_ids, count=30):
    """Create test edges between nodes"""
    print(f"🔗 Creating {count} test edges...")
    headers = {"Authorization": f"Bearer {token}"}
    
    edge_count = 0
    for i in range(min(count, len(node_ids) - 1)):
        edge_data = {
            "from_node_id": node_ids[i],
            "to_node_id": node_ids[(i + 1) % len(node_ids)],
            "type": ["dependency", "influence", "conflict", "support"][i % 4],
            "description": f"Connection {i+1}: Links node {i+1} to node {(i+1) % len(node_ids) + 1}"
        }
        
        response = requests.post(f"{BASE_URL}/workspaces/{workspace_id}/edges",
            headers=headers, json=edge_data)
        
        if response.status_code == 200:
            edge_count += 1
    
    print(f"✅ Created {edge_count} edges")
    return edge_count

def test_brief_generation(token, workspace_id, test_name=""):
    """Test brief generation performance"""
    print(f"🚀 Testing brief generation{' (' + test_name + ')' if test_name else ''}...")
    headers = {"Authorization": f"Bearer {token}"}
    
    start_time = time.time()
    response = requests.post(f"{BASE_URL}/documents/workspaces/{workspace_id}/generate-brief",
        headers=headers)
    end_time = time.time()
    
    duration = (end_time - start_time) * 1000  # Convert to milliseconds
    
    if response.status_code == 200:
        brief_data = response.json()
        content_length = len(brief_data["content"])
        node_count = brief_data["node_count"]
        edge_count = brief_data["edge_count"]
        
        print(f"✅ Brief generated successfully!")
        print(f"   ⏱️  Duration: {duration:.2f}ms")
        print(f"   📊 Nodes processed: {node_count}")
        print(f"   🔗 Edges processed: {edge_count}")
        print(f"   📄 Content length: {content_length:,} characters")
        print(f"   🎯 Performance: {content_length/duration:.1f} chars/ms")
        
        return {
            "success": True,
            "duration_ms": duration,
            "node_count": node_count,
            "edge_count": edge_count,
            "content_length": content_length,
            "performance_ratio": content_length/duration
        }
    else:
        print(f"❌ Brief generation failed: {response.status_code} - {response.text}")
        return {"success": False, "duration_ms": duration}

def cleanup_workspace(token, workspace_id):
    """Clean up test workspace"""
    print("🧹 Cleaning up test workspace...")
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.delete(f"{BASE_URL}/workspaces/{workspace_id}", headers=headers)
    if response.status_code == 200:
        print("✅ Workspace cleaned up")
    else:
        print(f"⚠️  Cleanup warning: {response.status_code}")

def main():
    print("🚀 OPTIMIZED LAST MILE BRIEF PERFORMANCE TEST")
    print("=" * 60)
    
    # Authenticate
    token = authenticate()
    if not token:
        return
    
    # Create test workspace
    workspace_id = create_test_workspace(token)
    if not workspace_id:
        return
    
    try:
        # Test with different data sizes
        test_scenarios = [
            {"nodes": 10, "edges": 5, "name": "Small Dataset"},
            {"nodes": 50, "edges": 30, "name": "Medium Dataset"},
            {"nodes": 100, "edges": 75, "name": "Large Dataset"}
        ]
        
        results = []
        
        for scenario in test_scenarios:
            print(f"\n📊 TESTING: {scenario['name']}")
            print("-" * 40)
            
            # Create test data
            node_ids = create_test_nodes(token, workspace_id, scenario["nodes"])
            if node_ids:
                create_test_edges(token, workspace_id, node_ids, scenario["edges"])
                
                # Test brief generation
                result = test_brief_generation(token, workspace_id, scenario["name"])
                results.append({**result, **scenario})
            
            print()
        
        # Summary
        print("📈 PERFORMANCE SUMMARY")
        print("=" * 60)
        successful_tests = [r for r in results if r.get("success")]
        
        if successful_tests:
            avg_duration = sum(r["duration_ms"] for r in successful_tests) / len(successful_tests)
            avg_performance = sum(r["performance_ratio"] for r in successful_tests) / len(successful_tests)
            
            print(f"✅ Successful tests: {len(successful_tests)}/{len(results)}")
            print(f"⏱️  Average duration: {avg_duration:.2f}ms")
            print(f"🎯 Average performance: {avg_performance:.1f} chars/ms")
            
            # Check if performance is good
            if avg_duration < 1000:  # Less than 1 second
                print("🚀 EXCELLENT: Brief generation is very fast!")
            elif avg_duration < 3000:  # Less than 3 seconds
                print("✅ GOOD: Brief generation performance is acceptable")
            else:
                print("⚠️  SLOW: Brief generation may need further optimization")
        else:
            print("❌ No successful tests completed")
    
    finally:
        # Cleanup
        cleanup_workspace(token, workspace_id)

if __name__ == "__main__":
    main()