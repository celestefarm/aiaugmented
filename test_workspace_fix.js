// Test script to verify workspace creation fix
// This script simulates the workspace creation flow

const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testWorkspaceCreation() {
    console.log('=== TESTING WORKSPACE CREATION FIX ===');
    
    try {
        // First, let's check if we can get workspaces
        const response = await fetch(`${API_BASE_URL}/workspaces`, {
            headers: {
                'Authorization': 'Bearer your_token_here', // You'll need to replace this
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Current workspaces:', data.workspaces.length);
            
            // Create a new workspace
            const createResponse = await fetch(`${API_BASE_URL}/workspaces`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer your_token_here', // You'll need to replace this
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: 'Test Workspace - ' + new Date().toISOString(),
                    settings: {},
                    transform: { x: 0, y: 0, scale: 1 }
                })
            });
            
            if (createResponse.ok) {
                const newWorkspace = await createResponse.json();
                console.log('New workspace created:', newWorkspace.id);
                
                // Test generateBrief with the new workspace
                const briefResponse = await fetch(`${API_BASE_URL}/workspaces/${newWorkspace.id}/generate-brief`, {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer your_token_here', // You'll need to replace this
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('Generate brief response status:', briefResponse.status);
                if (briefResponse.ok) {
                    console.log('✅ SUCCESS: generateBrief worked with new workspace');
                } else {
                    const error = await briefResponse.text();
                    console.log('❌ FAILED: generateBrief failed:', error);
                }
            } else {
                console.log('Failed to create workspace:', createResponse.status);
            }
        } else {
            console.log('Failed to get workspaces:', response.status);
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
}

// Note: This is a test script - you would need to run this in a browser console
// with proper authentication tokens
console.log('Test script created. Run testWorkspaceCreation() in browser console with proper auth token.');