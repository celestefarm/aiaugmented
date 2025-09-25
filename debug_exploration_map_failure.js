// Debug script to diagnose exploration map loading failures
// Run this in browser console when the error occurs

console.log('🔍 [EXPLORATION MAP DEBUG] Starting diagnostic checks...');

// 1. Check authentication state
const authToken = localStorage.getItem('auth_token');
console.log('🔐 [AUTH CHECK] Token exists:', !!authToken);
if (authToken) {
  try {
    const tokenParts = authToken.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(atob(tokenParts[1]));
      console.log('🔐 [AUTH CHECK] Token payload:', payload);
      console.log('🔐 [AUTH CHECK] Token expires:', new Date(payload.exp * 1000));
      console.log('🔐 [AUTH CHECK] Token expired:', Date.now() > payload.exp * 1000);
    }
  } catch (e) {
    console.error('🔐 [AUTH CHECK] Invalid token format:', e);
  }
} else {
  console.error('🔐 [AUTH CHECK] No authentication token found');
}

// 2. Check current workspace state
const workspaceContext = window.React?.useContext ? 'Available' : 'Not Available';
console.log('🏠 [WORKSPACE CHECK] React context:', workspaceContext);

// 3. Check API connectivity
const API_BASE_URL = 'http://localhost:8000/api/v1';
console.log('🌐 [API CHECK] Testing connectivity to:', API_BASE_URL);

fetch(`${API_BASE_URL}/healthz`)
  .then(response => {
    console.log('🌐 [API CHECK] Health endpoint response:', {
      status: response.status,
      ok: response.ok,
      url: response.url
    });
    return response.json();
  })
  .then(data => {
    console.log('🌐 [API CHECK] Health data:', data);
  })
  .catch(error => {
    console.error('🌐 [API CHECK] Health check failed:', error);
    console.error('🌐 [API CHECK] This indicates backend server is not running or not accessible');
  });

// 4. Test workspace API call
if (authToken) {
  console.log('🏠 [WORKSPACE API] Testing workspace list endpoint...');
  fetch(`${API_BASE_URL}/workspaces`, {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  })
  .then(response => {
    console.log('🏠 [WORKSPACE API] Response:', {
      status: response.status,
      ok: response.ok,
      statusText: response.statusText
    });
    if (!response.ok) {
      return response.text().then(text => {
        console.error('🏠 [WORKSPACE API] Error response:', text);
        throw new Error(`HTTP ${response.status}: ${text}`);
      });
    }
    return response.json();
  })
  .then(data => {
    console.log('🏠 [WORKSPACE API] Workspaces data:', data);
    
    // Test nodes API for first workspace
    if (data.workspaces && data.workspaces.length > 0) {
      const firstWorkspace = data.workspaces[0];
      console.log('📊 [NODES API] Testing nodes endpoint for workspace:', firstWorkspace.id);
      
      return fetch(`${API_BASE_URL}/workspaces/${firstWorkspace.id}/nodes`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
    }
  })
  .then(response => {
    if (response) {
      console.log('📊 [NODES API] Response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
      if (!response.ok) {
        return response.text().then(text => {
          console.error('📊 [NODES API] Error response:', text);
        });
      }
      return response.json();
    }
  })
  .then(data => {
    if (data) {
      console.log('📊 [NODES API] Nodes data:', data);
    }
  })
  .catch(error => {
    console.error('🚨 [API TEST] Failed:', error);
  });
}

// 5. Check browser console for additional errors
console.log('🔍 [DEBUG] Check browser Network tab for failed requests');
console.log('🔍 [DEBUG] Check browser Console tab for additional error messages');
console.log('🔍 [DEBUG] Look for CORS errors, 401/403 authentication errors, or 404 not found errors');

console.log('🔍 [EXPLORATION MAP DEBUG] Diagnostic checks completed');