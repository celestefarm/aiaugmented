#!/usr/bin/env python3
"""
Comprehensive test script to verify the exploration map loading fix.
This script tests the most likely failure scenarios and validates the fix.
"""

import asyncio
import aiohttp
import json
import sys
import time
from datetime import datetime, timedelta
import jwt
import os

# Configuration
API_BASE_URL = "http://localhost:8000/api/v1"
TEST_USER_EMAIL = "celeste@example.com"
TEST_USER_PASSWORD = "password123"

class ExplorationMapFixTester:
    def __init__(self):
        self.session = None
        self.auth_token = None
        self.user_id = None
        self.workspace_id = None
        self.test_results = []

    async def setup_session(self):
        """Setup HTTP session with proper headers"""
        self.session = aiohttp.ClientSession(
            headers={'Content-Type': 'application/json'},
            timeout=aiohttp.ClientTimeout(total=30)
        )

    async def cleanup_session(self):
        """Cleanup HTTP session"""
        if self.session:
            await self.session.close()

    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"    Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })

    async def test_api_connectivity(self):
        """Test 1: API Server Connectivity"""
        try:
            async with self.session.get(f"{API_BASE_URL}/healthz") as response:
                if response.status == 200:
                    health_data = await response.json()
                    self.log_test("API Connectivity", True, "Backend server is running", health_data)
                    return True
                else:
                    self.log_test("API Connectivity", False, f"Health check failed: {response.status}")
                    return False
        except Exception as e:
            self.log_test("API Connectivity", False, f"Cannot connect to backend: {str(e)}")
            return False

    async def test_authentication(self):
        """Test 2: Authentication System"""
        try:
            login_data = {
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
            
            async with self.session.post(f"{API_BASE_URL}/auth/login", json=login_data) as response:
                if response.status == 200:
                    auth_response = await response.json()
                    self.auth_token = auth_response.get('access_token')
                    user_data = auth_response.get('user', {})
                    self.user_id = user_data.get('id') or user_data.get('_id')
                    
                    if self.auth_token and self.user_id:
                        # Validate token format and expiration
                        try:
                            # Decode without verification to check structure
                            decoded = jwt.decode(self.auth_token, options={"verify_signature": False})
                            exp_time = datetime.fromtimestamp(decoded.get('exp', 0))
                            is_expired = datetime.now() > exp_time
                            
                            self.log_test("Authentication", True, 
                                        f"Login successful, token expires: {exp_time}", 
                                        {"user_id": self.user_id, "token_expired": is_expired})
                            
                            # Update session headers with auth token
                            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                            return True
                        except Exception as token_error:
                            self.log_test("Authentication", False, f"Invalid token format: {str(token_error)}")
                            return False
                    else:
                        self.log_test("Authentication", False, "Missing token or user ID in response")
                        return False
                else:
                    error_text = await response.text()
                    self.log_test("Authentication", False, f"Login failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_test("Authentication", False, f"Authentication error: {str(e)}")
            return False

    async def test_workspace_access(self):
        """Test 3: Workspace Access"""
        try:
            async with self.session.get(f"{API_BASE_URL}/workspaces") as response:
                if response.status == 200:
                    workspaces_data = await response.json()
                    workspaces = workspaces_data.get('workspaces', [])
                    
                    if workspaces:
                        self.workspace_id = workspaces[0]['id']
                        
                        # Validate workspace ID format (should be 24-char hex for ObjectId)
                        import re
                        objectid_pattern = re.compile(r'^[0-9a-fA-F]{24}$')
                        is_valid_format = objectid_pattern.match(self.workspace_id)
                        
                        self.log_test("Workspace Access", True, 
                                    f"Found {len(workspaces)} workspace(s), using: {self.workspace_id}",
                                    {"workspace_count": len(workspaces), "id_format_valid": is_valid_format})
                        return True
                    else:
                        self.log_test("Workspace Access", False, "No workspaces found for user")
                        return False
                else:
                    error_text = await response.text()
                    self.log_test("Workspace Access", False, f"Workspace list failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_test("Workspace Access", False, f"Workspace access error: {str(e)}")
            return False

    async def test_specific_workspace_access(self):
        """Test 4: Specific Workspace Access"""
        if not self.workspace_id:
            self.log_test("Specific Workspace Access", False, "No workspace ID available")
            return False
            
        try:
            async with self.session.get(f"{API_BASE_URL}/workspaces/{self.workspace_id}") as response:
                if response.status == 200:
                    workspace_data = await response.json()
                    self.log_test("Specific Workspace Access", True, 
                                f"Workspace accessible: {workspace_data.get('title', 'Untitled')}")
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Specific Workspace Access", False, 
                                f"Workspace not accessible: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_test("Specific Workspace Access", False, f"Workspace access error: {str(e)}")
            return False

    async def test_nodes_api(self):
        """Test 5: Nodes API (Primary Failure Point)"""
        if not self.workspace_id:
            self.log_test("Nodes API", False, "No workspace ID available")
            return False
            
        try:
            # Add cache-busting parameter like the frontend does
            cache_buster = int(time.time() * 1000)
            endpoint = f"{API_BASE_URL}/workspaces/{self.workspace_id}/nodes?_t={cache_buster}"
            
            async with self.session.get(endpoint) as response:
                if response.status == 200:
                    nodes_data = await response.json()
                    nodes = nodes_data.get('nodes', [])
                    self.log_test("Nodes API", True, 
                                f"Nodes API successful, found {len(nodes)} nodes",
                                {"node_count": len(nodes), "cache_buster": cache_buster})
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Nodes API", False, 
                                f"Nodes API failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_test("Nodes API", False, f"Nodes API error: {str(e)}")
            return False

    async def test_edges_api(self):
        """Test 6: Edges API (Secondary Failure Point)"""
        if not self.workspace_id:
            self.log_test("Edges API", False, "No workspace ID available")
            return False
            
        try:
            # Add cache-busting parameter like the frontend does
            cache_buster = int(time.time() * 1000)
            endpoint = f"{API_BASE_URL}/workspaces/{self.workspace_id}/edges?_t={cache_buster}"
            
            async with self.session.get(endpoint) as response:
                if response.status == 200:
                    edges_data = await response.json()
                    edges = edges_data.get('edges', [])
                    self.log_test("Edges API", True, 
                                f"Edges API successful, found {len(edges)} edges",
                                {"edge_count": len(edges), "cache_buster": cache_buster})
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Edges API", False, 
                                f"Edges API failed: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_test("Edges API", False, f"Edges API error: {str(e)}")
            return False

    async def test_token_expiration_handling(self):
        """Test 7: Token Expiration Handling"""
        try:
            # Create an expired token for testing
            expired_payload = {
                'sub': self.user_id,
                'exp': int((datetime.now() - timedelta(hours=1)).timestamp()),
                'iat': int((datetime.now() - timedelta(hours=2)).timestamp())
            }
            
            # Create a fake expired token (won't be valid but tests client-side handling)
            expired_token = jwt.encode(expired_payload, 'fake-secret', algorithm='HS256')
            
            # Test with expired token
            headers = {'Authorization': f'Bearer {expired_token}', 'Content-Type': 'application/json'}
            
            async with aiohttp.ClientSession(headers=headers) as temp_session:
                async with temp_session.get(f"{API_BASE_URL}/workspaces") as response:
                    if response.status == 401:
                        self.log_test("Token Expiration Handling", True, 
                                    "Server correctly rejects expired token")
                        return True
                    else:
                        self.log_test("Token Expiration Handling", False, 
                                    f"Server should reject expired token but returned: {response.status}")
                        return False
        except Exception as e:
            self.log_test("Token Expiration Handling", False, f"Token expiration test error: {str(e)}")
            return False

    async def test_invalid_workspace_id_handling(self):
        """Test 8: Invalid Workspace ID Handling"""
        try:
            # Test with invalid workspace ID format
            invalid_workspace_id = "invalid-workspace-id-123"
            
            async with self.session.get(f"{API_BASE_URL}/workspaces/{invalid_workspace_id}") as response:
                if response.status == 400:
                    self.log_test("Invalid Workspace ID Handling", True, 
                                "Server correctly rejects invalid workspace ID format")
                    return True
                else:
                    error_text = await response.text()
                    self.log_test("Invalid Workspace ID Handling", False, 
                                f"Server should reject invalid ID but returned: {response.status} - {error_text}")
                    return False
        except Exception as e:
            self.log_test("Invalid Workspace ID Handling", False, f"Invalid workspace ID test error: {str(e)}")
            return False

    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("🔍 Starting Exploration Map Fix Verification Tests")
        print("=" * 60)
        
        await self.setup_session()
        
        try:
            # Run tests in order of dependency
            tests = [
                self.test_api_connectivity,
                self.test_authentication,
                self.test_workspace_access,
                self.test_specific_workspace_access,
                self.test_nodes_api,
                self.test_edges_api,
                self.test_token_expiration_handling,
                self.test_invalid_workspace_id_handling
            ]
            
            for test in tests:
                await test()
                await asyncio.sleep(0.5)  # Small delay between tests
                
        finally:
            await self.cleanup_session()
        
        # Print summary
        print("\n" + "=" * 60)
        print("🔍 Test Summary")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 All tests passed! The exploration map fix should work correctly.")
        else:
            print("⚠️  Some tests failed. The exploration map may still have issues.")
            print("\nFailed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['message']}")
        
        # Save detailed results
        with open('exploration_map_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'passed': passed,
                    'total': total,
                    'success_rate': (passed/total)*100,
                    'timestamp': datetime.now().isoformat()
                },
                'results': self.test_results
            }, f, indent=2)
        
        print(f"\nDetailed results saved to: exploration_map_test_results.json")
        
        return passed == total

async def main():
    """Main test runner"""
    tester = ExplorationMapFixTester()
    success = await tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())