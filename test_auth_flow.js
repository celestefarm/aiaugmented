// Test script to verify authentication token handling
// This can be run in the browser console to test the auth flow

console.log('=== AUTHENTICATION FLOW TEST ===');

// Test 1: Check if token exists in localStorage
const token = localStorage.getItem('auth_token');
console.log('1. Token exists in localStorage:', !!token);
if (token) {
  console.log('   Token preview:', token.substring(0, 20) + '...');
}

// Test 2: Check API client authentication status
if (typeof apiClient !== 'undefined') {
  console.log('2. API client isAuthenticated():', apiClient.isAuthenticated());
} else {
  console.log('2. API client not available in global scope');
}

// Test 3: Test API request with current token
async function testApiRequest() {
  try {
    const response = await fetch('http://localhost:8000/api/v1/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('3. API request status:', response.status);
    
    if (response.ok) {
      const user = await response.json();
      console.log('   User data:', user);
    } else {
      const error = await response.text();
      console.log('   Error:', error);
    }
  } catch (error) {
    console.log('3. API request failed:', error.message);
  }
}

if (token) {
  testApiRequest();
} else {
  console.log('3. Skipping API test - no token available');
}

// Test 4: Check authentication context state (if available)
if (typeof window !== 'undefined' && window.React) {
  console.log('4. React context test would need to be run within the app');
} else {
  console.log('4. React not available for context testing');
}

console.log('=== TEST COMPLETE ===');