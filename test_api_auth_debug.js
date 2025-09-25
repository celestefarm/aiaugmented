// Simple test script to debug authentication and API calls
console.log('=== API AUTHENTICATION DEBUG TEST ===');

// Check if we're in browser environment
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  // Check authentication token
  const token = localStorage.getItem('auth_token');
  console.log('🔍 Authentication Status:');
  console.log('  - Token exists:', !!token);
  console.log('  - Token length:', token ? token.length : 0);
  console.log('  - Token preview:', token ? `${token.substring(0, 20)}...` : 'none');
  
  // Test API connectivity
  const API_BASE_URL = 'http://localhost:8000/api/v1';
  
  // Test health endpoint
  console.log('🔍 Testing health endpoint...');
  fetch(`${API_BASE_URL}/healthz`)
    .then(response => {
      console.log('✅ Health check response:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });
      return response.json();
    })
    .then(data => {
      console.log('✅ Health check data:', data);
    })
    .catch(error => {
      console.error('❌ Health check failed:', error);
    });
  
  // Test authenticated endpoint if token exists
  if (token) {
    console.log('🔍 Testing authenticated endpoint...');
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
    .then(response => {
      console.log('🔍 Auth me response:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    })
    .then(user => {
      console.log('✅ Current user:', user);
      
      // Test workspaces endpoint
      console.log('🔍 Testing workspaces endpoint...');
      return fetch(`${API_BASE_URL}/workspaces`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
    })
    .then(response => {
      console.log('🔍 Workspaces response:', {
        status: response.status,
        ok: response.ok,
        url: response.url
      });
      if (response.ok) {
        return response.json();
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    })
    .then(workspaces => {
      console.log('✅ Workspaces:', workspaces);
      
      // If we have workspaces, test nodes endpoint for the first one
      if (workspaces.workspaces && workspaces.workspaces.length > 0) {
        const firstWorkspace = workspaces.workspaces[0];
        console.log('🔍 Testing nodes endpoint for workspace:', firstWorkspace.id);
        
        return fetch(`${API_BASE_URL}/workspaces/${firstWorkspace.id}/nodes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        console.log('⚠️ No workspaces found to test nodes endpoint');
        return null;
      }
    })
    .then(response => {
      if (response) {
        console.log('🔍 Nodes response:', {
          status: response.status,
          ok: response.ok,
          url: response.url
        });
        if (response.ok) {
          return response.json();
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }
      return null;
    })
    .then(nodes => {
      if (nodes) {
        console.log('✅ Nodes:', nodes);
      }
    })
    .catch(error => {
      console.error('❌ API test failed:', error);
    });
  } else {
    console.log('⚠️ No authentication token found - user needs to log in');
  }
} else {
  console.log('❌ Not in browser environment - cannot test localStorage');
}