#!/usr/bin/env python3
"""
Last Mile Brief Performance Testing Script

This script tests the performance bottlenecks identified in the Last Mile Brief generation
by creating test workspaces with varying data sizes and measuring response times.

Usage: python test_last_mile_brief_performance.py
"""

import asyncio
import time
import statistics
import requests
import json
from typing import Dict, List, Any
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpassword123"

class PerformanceTestResults:
    def __init__(self):
        self.results: List[Dict[str, Any]] = []
        
    def add_result(self, test_name: str, node_count: int, edge_count: int, 
                   duration: float, success: bool, error: str = None):
        self.results.append({
            'test_name': test_name,
            'node_count': node_count,
            'edge_count': edge_count,
            'duration_ms': duration * 1000,
            'success': success,
            'error': error,
            'timestamp': datetime.utcnow().isoformat()
        })
    
    def print_summary(self):
        print("\n" + "="*80)
        print("LAST MILE BRIEF PERFORMANCE TEST RESULTS")
        print("="*80)
        
        successful_tests = [r for r in self.results if r['success']]
        failed_tests = [r for r in self.results if not r['success']]
        
        print(f"Total Tests: {len(self.results)}")
        print(f"Successful: {len(successful_tests)}")
        print(f"Failed: {len(failed_tests)}")
        
        if successful_tests:
            durations = [r['duration_ms'] for r in successful_tests]
            print(f"\nPerformance Summary:")
            print(f"  Average Duration: {statistics.mean(durations):.2f}ms")
            print(f"  Median Duration: {statistics.median(durations):.2f}ms")
            print(f"  Min Duration: {min(durations):.2f}ms")
            print(f"  Max Duration: {max(durations):.2f}ms")
            
            # Performance by data size
            print(f"\nPerformance by Data Size:")
            size_groups = {}
            for result in successful_tests:
                size_key = f"{result['node_count']}N_{result['edge_count']}E"
                if size_key not in size_groups:
                    size_groups[size_key] = []
                size_groups[size_key].append(result['duration_ms'])
            
            for size_key, durations in sorted(size_groups.items()):
                avg_duration = statistics.mean(durations)
                print(f"  {size_key}: {avg_duration:.2f}ms avg ({len(durations)} tests)")
        
        if failed_tests:
            print(f"\nFailed Tests:")
            for result in failed_tests:
                print(f"  {result['test_name']}: {result['error']}")
        
        print("\n" + "="*80)

class LastMileBriefPerformanceTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.results = PerformanceTestResults()
        
    def authenticate(self) -> bool:
        """Authenticate with the API"""
        print("🔐 Authenticating with API...")
        
        # Try to login
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False
    
    def create_test_workspace(self, name: str) -> str:
        """Create a test workspace"""
        try:
            response = self.session.post(f"{BASE_URL}/workspaces", json={
                "title": name,
                "description": f"Performance test workspace: {name}"
            })
            
            if response.status_code == 201:
                workspace_data = response.json()
                workspace_id = workspace_data["id"]
                print(f"✅ Created workspace: {name} (ID: {workspace_id})")
                return workspace_id
            else:
                print(f"❌ Failed to create workspace: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            print(f"❌ Workspace creation error: {e}")
            return None
    
    def create_test_nodes(self, workspace_id: str, count: int) -> List[str]:
        """Create test nodes in a workspace"""
        node_ids = []
        
        for i in range(count):
            try:
                node_data = {
                    "title": f"Test Node {i+1}",
                    "description": f"This is test node {i+1} for performance testing. " * 5,  # Make it longer
                    "type": ["human", "ai", "decision", "risk", "dependency"][i % 5],
                    "x": 100 + (i % 10) * 150,
                    "y": 100 + (i // 10) * 150,
                    "confidence": 50 + (i % 50)
                }
                
                response = self.session.post(f"{BASE_URL}/workspaces/{workspace_id}/nodes", json=node_data)
                
                if response.status_code == 201:
                    node_data = response.json()
                    node_ids.append(node_data["id"])
                else:
                    print(f"⚠️ Failed to create node {i+1}: {response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ Node creation error for node {i+1}: {e}")
        
        print(f"✅ Created {len(node_ids)} nodes")
        return node_ids
    
    def create_test_edges(self, workspace_id: str, node_ids: List[str], count: int) -> List[str]:
        """Create test edges between nodes"""
        edge_ids = []
        
        if len(node_ids) < 2:
            return edge_ids
        
        for i in range(min(count, len(node_ids) * (len(node_ids) - 1) // 2)):
            try:
                from_idx = i % len(node_ids)
                to_idx = (i + 1) % len(node_ids)
                
                if from_idx == to_idx:
                    to_idx = (to_idx + 1) % len(node_ids)
                
                edge_data = {
                    "from_node_id": node_ids[from_idx],
                    "to_node_id": node_ids[to_idx],
                    "type": ["depends_on", "influences", "blocks", "enables"][i % 4],
                    "description": f"Test connection {i+1} between nodes"
                }
                
                response = self.session.post(f"{BASE_URL}/workspaces/{workspace_id}/edges", json=edge_data)
                
                if response.status_code == 201:
                    edge_data = response.json()
                    edge_ids.append(edge_data["id"])
                else:
                    print(f"⚠️ Failed to create edge {i+1}: {response.status_code}")
                    
            except Exception as e:
                print(f"⚠️ Edge creation error for edge {i+1}: {e}")
        
        print(f"✅ Created {len(edge_ids)} edges")
        return edge_ids
    
    def test_brief_generation_performance(self, workspace_id: str, test_name: str, 
                                        node_count: int, edge_count: int) -> bool:
        """Test brief generation performance for a workspace"""
        print(f"🧪 Testing brief generation: {test_name}")
        
        try:
            start_time = time.time()
            
            response = self.session.post(f"{BASE_URL}/workspaces/{workspace_id}/generate-brief")
            
            end_time = time.time()
            duration = end_time - start_time
            
            if response.status_code == 200:
                brief_data = response.json()
                content_length = len(brief_data.get("content", ""))
                
                print(f"✅ {test_name}: {duration*1000:.2f}ms (Content: {content_length} chars)")
                
                self.results.add_result(
                    test_name=test_name,
                    node_count=node_count,
                    edge_count=edge_count,
                    duration=duration,
                    success=True
                )
                return True
            else:
                error_msg = f"HTTP {response.status_code}: {response.text}"
                print(f"❌ {test_name}: {error_msg}")
                
                self.results.add_result(
                    test_name=test_name,
                    node_count=node_count,
                    edge_count=edge_count,
                    duration=duration,
                    success=False,
                    error=error_msg
                )
                return False
                
        except Exception as e:
            error_msg = str(e)
            print(f"❌ {test_name}: {error_msg}")
            
            self.results.add_result(
                test_name=test_name,
                node_count=node_count,
                edge_count=edge_count,
                duration=0,
                success=False,
                error=error_msg
            )
            return False
    
    def cleanup_workspace(self, workspace_id: str):
        """Clean up test workspace"""
        try:
            response = self.session.delete(f"{BASE_URL}/workspaces/{workspace_id}")
            if response.status_code == 200:
                print(f"🧹 Cleaned up workspace: {workspace_id}")
            else:
                print(f"⚠️ Failed to cleanup workspace: {response.status_code}")
        except Exception as e:
            print(f"⚠️ Cleanup error: {e}")
    
    def run_performance_tests(self):
        """Run comprehensive performance tests"""
        print("🚀 Starting Last Mile Brief Performance Tests")
        print("="*60)
        
        if not self.authenticate():
            print("❌ Cannot proceed without authentication")
            return
        
        # Test scenarios with different data sizes
        test_scenarios = [
            {"name": "Empty Workspace", "nodes": 0, "edges": 0},
            {"name": "Small Dataset", "nodes": 5, "edges": 3},
            {"name": "Medium Dataset", "nodes": 20, "edges": 15},
            {"name": "Large Dataset", "nodes": 50, "edges": 40},
            {"name": "Very Large Dataset", "nodes": 100, "edges": 80},
            {"name": "Edge-Heavy Dataset", "nodes": 30, "edges": 100},
        ]
        
        for scenario in test_scenarios:
            print(f"\n📊 Running scenario: {scenario['name']}")
            print(f"   Target: {scenario['nodes']} nodes, {scenario['edges']} edges")
            
            # Create test workspace
            workspace_name = f"perf_test_{scenario['name'].lower().replace(' ', '_')}"
            workspace_id = self.create_test_workspace(workspace_name)
            
            if not workspace_id:
                continue
            
            try:
                # Create test data
                node_ids = []
                if scenario['nodes'] > 0:
                    node_ids = self.create_test_nodes(workspace_id, scenario['nodes'])
                
                edge_ids = []
                if scenario['edges'] > 0 and len(node_ids) > 1:
                    edge_ids = self.create_test_edges(workspace_id, node_ids, scenario['edges'])
                
                # Run multiple tests for this scenario to get average
                for test_run in range(3):
                    test_name = f"{scenario['name']}_Run_{test_run + 1}"
                    self.test_brief_generation_performance(
                        workspace_id, 
                        test_name, 
                        len(node_ids), 
                        len(edge_ids)
                    )
                    
                    # Small delay between tests
                    time.sleep(1)
                
            finally:
                # Cleanup
                self.cleanup_workspace(workspace_id)
        
        # Print results
        self.results.print_summary()
        
        # Save results to file
        results_file = f"last_mile_brief_performance_results_{int(time.time())}.json"
        with open(results_file, 'w') as f:
            json.dump(self.results.results, f, indent=2)
        print(f"📁 Results saved to: {results_file}")

def main():
    """Main test execution"""
    tester = LastMileBriefPerformanceTester()
    tester.run_performance_tests()

if __name__ == "__main__":
    main()