#!/usr/bin/env python3
"""
Fix workspace agent configuration via API endpoints.
This script uses the backend's REST API to add active agents to all workspaces.
"""

import asyncio
import aiohttp
import json
import sys

BACKEND_URL = "http://localhost:8000"

async def fix_workspace_agents():
    """Fix workspace agent configuration by adding active agents to all workspaces via API"""
    print("🚀 Starting API-Based Workspace Agent Configuration Fix...")
    print("=" * 80)
    
    try:
        async with aiohttp.ClientSession() as session:
            # First, let's try to get all workspaces (this might require authentication)
            print("🔍 Attempting to access workspaces via API...")
            
            # Try to get workspaces without authentication first
            try:
                async with session.get(f"{BACKEND_URL}/api/v1/workspaces") as response:
                    if response.status == 401:
                        print("❌ API requires authentication - cannot access workspaces directly")
                        print("💡 This approach won't work with the current API security")
                        return False
                    elif response.status == 200:
                        workspaces = await response.json()
                        print(f"✅ Found {len(workspaces)} workspaces")
                        # Process workspaces...
                    else:
                        print(f"❌ Unexpected response status: {response.status}")
                        return False
            except Exception as e:
                print(f"❌ Failed to connect to API: {e}")
                return False
                
    except Exception as e:
        print(f"❌ ERROR: Failed to fix workspace agents via API: {e}")
        return False

async def main():
    """Main function"""
    success = await fix_workspace_agents()
    if success:
        print("\n✅ Fix completed successfully!")
        sys.exit(0)
    else:
        print("\n❌ Fix failed - API approach not viable")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())