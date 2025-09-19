#!/usr/bin/env python3
"""
Direct API test for login endpoint to isolate the issue.
"""

import asyncio
import aiohttp
import json

async def test_login_api():
    """Test the login API endpoint directly"""
    
    print("=== DIRECT LOGIN API TEST ===")
    
    # API endpoint
    api_url = "http://localhost:8000/api/v1/auth/login"
    
    # Login data
    login_data = {
        "email": "celeste.fcp@gmail.com",
        "password": "celeste060291"
    }
    
    print(f"Testing endpoint: {api_url}")
    print(f"Login data: {login_data}")
    print()
    
    try:
        async with aiohttp.ClientSession() as session:
            print("1. Making POST request to login endpoint...")
            
            async with session.post(
                api_url,
                json=login_data,
                headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                }
            ) as response:
                print(f"Response status: {response.status}")
                print(f"Response headers: {dict(response.headers)}")
                
                # Get response text
                response_text = await response.text()
                print(f"Response text: {response_text}")
                
                if response.status == 200:
                    try:
                        response_json = json.loads(response_text)
                        print("✅ LOGIN SUCCESSFUL!")
                        print(f"Access token: {response_json.get('access_token', 'N/A')[:50]}...")
                        print(f"Token type: {response_json.get('token_type', 'N/A')}")
                        print(f"User: {response_json.get('user', {}).get('email', 'N/A')}")
                        return True
                    except json.JSONDecodeError as e:
                        print(f"❌ JSON decode error: {e}")
                        return False
                else:
                    print(f"❌ LOGIN FAILED with status {response.status}")
                    try:
                        error_json = json.loads(response_text)
                        print(f"Error detail: {error_json.get('detail', 'No detail provided')}")
                    except json.JSONDecodeError:
                        print(f"Raw error response: {response_text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Request failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_cors_preflight():
    """Test CORS preflight request"""
    
    print("\n=== CORS PREFLIGHT TEST ===")
    
    api_url = "http://localhost:8000/api/v1/auth/login"
    
    try:
        async with aiohttp.ClientSession() as session:
            print("Testing OPTIONS request (CORS preflight)...")
            
            async with session.options(
                api_url,
                headers={
                    "Origin": "http://localhost:5137",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers": "Content-Type"
                }
            ) as response:
                print(f"OPTIONS response status: {response.status}")
                print(f"CORS headers: {dict(response.headers)}")
                
                if response.status == 200:
                    print("✅ CORS preflight successful")
                    return True
                else:
                    print(f"❌ CORS preflight failed with status {response.status}")
                    return False
                    
    except Exception as e:
        print(f"❌ CORS test failed: {e}")
        return False

async def main():
    """Run all tests"""
    
    # Test CORS first
    cors_ok = await test_cors_preflight()
    
    # Test login API
    login_ok = await test_login_api()
    
    print("\n=== TEST SUMMARY ===")
    print(f"CORS preflight: {'✅' if cors_ok else '❌'}")
    print(f"Login API: {'✅' if login_ok else '❌'}")
    
    if cors_ok and login_ok:
        print("\n🎉 All API tests passed - the issue might be in the frontend!")
    else:
        print("\n⚠️  API issues detected - need to investigate backend")

if __name__ == "__main__":
    asyncio.run(main())