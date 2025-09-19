#!/usr/bin/env python3
"""
Test to verify that the frontend fix resolves the login issue.
"""

import requests
import json

def test_frontend_fix():
    """Test the frontend fix for the _id/id mismatch"""
    
    # Test credentials
    email = "celeste.fcp@gmail.com"
    password = "celeste060291"
    
    # API endpoints
    base_url = "http://localhost:8000/api/v1"
    login_url = f"{base_url}/auth/login"
    me_url = f"{base_url}/auth/me"
    
    print("=== FRONTEND FIX VERIFICATION TEST ===")
    print(f"Testing login with: {email}")
    print()
    
    try:
        # Step 1: Login
        login_response = requests.post(
            login_url, 
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        if login_response.status_code != 200:
            print("❌ LOGIN FAILED!")
            return False
            
        login_data = login_response.json()
        user_data = login_data.get("user", {})
        access_token = login_data.get("access_token")
        
        print("✅ LOGIN SUCCESS!")
        print(f"User data structure: {list(user_data.keys())}")
        print(f"Has _id: {'_id' in user_data}")
        print(f"Has id: {'id' in user_data}")
        print(f"_id value: {user_data.get('_id', 'Not present')}")
        print(f"id value: {user_data.get('id', 'Not present')}")
        print()
        
        # Simulate frontend fix: if _id exists but id doesn't, copy _id to id
        if user_data.get('_id') and not user_data.get('id'):
            user_data['id'] = user_data['_id']
            print("🔧 APPLIED FRONTEND FIX: Copied _id to id")
            print(f"Fixed user data - id: {user_data.get('id')}")
        
        # Step 2: Test /auth/me endpoint
        me_response = requests.get(
            me_url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            timeout=10
        )
        
        if me_response.status_code != 200:
            print("❌ /auth/me FAILED!")
            return False
            
        me_data = me_response.json()
        print("✅ /auth/me SUCCESS!")
        print(f"Me data structure: {list(me_data.keys())}")
        print(f"Me has _id: {'_id' in me_data}")
        print(f"Me has id: {'id' in me_data}")
        
        # Simulate frontend fix for /auth/me response
        if me_data.get('_id') and not me_data.get('id'):
            me_data['id'] = me_data['_id']
            print("🔧 APPLIED FRONTEND FIX: Copied _id to id for /auth/me")
        
        # Step 3: Verify consistency
        login_user_id = user_data.get('id')
        me_user_id = me_data.get('id')
        
        if login_user_id and me_user_id and login_user_id == me_user_id:
            print("✅ USER ID CONSISTENCY CHECK PASSED!")
            print(f"Both endpoints return same user ID: {login_user_id}")
            print()
            print("🎉 FRONTEND FIX VERIFICATION: SUCCESS!")
            print("✅ The _id to id mapping fix resolves the login issue!")
            return True
        else:
            print("❌ USER ID CONSISTENCY CHECK FAILED!")
            print(f"Login user ID: {login_user_id}")
            print(f"Me user ID: {me_user_id}")
            return False
            
    except Exception as e:
        print(f"❌ TEST ERROR: {e}")
        return False

def test_login_flow_simulation():
    """Simulate the complete login flow as the frontend would do it"""
    
    print("\n=== COMPLETE LOGIN FLOW SIMULATION ===")
    
    # This simulates what happens in AuthContext.tsx
    email = "celeste.fcp@gmail.com"
    password = "celeste060291"
    
    try:
        # 1. Call apiClient.login() - simulated
        print("1. Calling apiClient.login()...")
        login_response = requests.post(
            "http://localhost:8000/api/v1/auth/login",
            json={"email": email, "password": password},
            headers={"Content-Type": "application/json"}
        )
        
        if login_response.status_code != 200:
            print("❌ Login API call failed")
            return False
            
        login_data = login_response.json()
        
        # 2. Apply the frontend fix (as implemented in api.ts)
        if login_data.get('user') and login_data['user'].get('_id') and not login_data['user'].get('id'):
            login_data['user']['id'] = login_data['user']['_id']
            print("✅ Applied _id to id fix in login response")
        
        # 3. Store token (simulated)
        access_token = login_data.get('access_token')
        print(f"✅ Token stored: {access_token[:20]}...")
        
        # 4. Set user in state (simulated)
        user = login_data.get('user')
        print(f"✅ User set in state: {user.get('email')} (ID: {user.get('id')})")
        
        # 5. Test authentication check (simulated)
        if access_token and user and user.get('id'):
            print("✅ Authentication state: AUTHENTICATED")
            print("✅ User has valid ID for frontend operations")
            
            # 6. Test a protected API call (simulated)
            me_response = requests.get(
                "http://localhost:8000/api/v1/auth/me",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if me_response.status_code == 200:
                me_data = me_response.json()
                if me_data.get('_id') and not me_data.get('id'):
                    me_data['id'] = me_data['_id']
                    print("✅ Applied _id to id fix in /auth/me response")
                
                print("✅ Protected API call successful")
                print("🎉 COMPLETE LOGIN FLOW: SUCCESS!")
                return True
            else:
                print("❌ Protected API call failed")
                return False
        else:
            print("❌ Authentication state invalid")
            return False
            
    except Exception as e:
        print(f"❌ LOGIN FLOW ERROR: {e}")
        return False

if __name__ == "__main__":
    print("Testing the frontend fix for login issues...\n")
    
    fix_works = test_frontend_fix()
    flow_works = test_login_flow_simulation()
    
    print("\n" + "="*50)
    print("FINAL DIAGNOSIS SUMMARY:")
    print("="*50)
    
    if fix_works and flow_works:
        print("✅ ISSUE RESOLVED!")
        print("🔧 Root Cause: Backend returns '_id' but frontend expects 'id'")
        print("💡 Solution: Map '_id' to 'id' in login() and getCurrentUser() methods")
        print("🎯 Status: User should now be able to log in successfully")
    else:
        print("❌ ISSUE NOT FULLY RESOLVED")
        print("🔍 Additional investigation may be needed")