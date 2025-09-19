// Test script to verify the summarization API is working
const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testSummarizationAPI() {
    console.log('=== TESTING SUMMARIZATION API ===');
    
    // Get auth token from localStorage (simulate browser environment)
    const token = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2OGNiMjhhZDJmZjE0YjcwYTQ3YWZhYmIiLCJlbWFpbCI6ImNlbGVzdGUuZmNwQGdtYWlsLmNvIiwibmFtZSI6IkNlbGVzdGUiLCJleHAiOjE3MjY3NTU2MzZ9.example'; // This would be the real token
    
    // Test node ID from the backend logs
    const nodeId = '68cce03bba16f7e6d76aea3b';
    
    const requestData = {
        context: 'card',
        max_length: 25
    };
    
    console.log('Making API call to:', `${API_BASE_URL}/nodes/${nodeId}/summarize`);
    console.log('Request data:', requestData);
    
    try {
        const response = await fetch(`${API_BASE_URL}/nodes/${nodeId}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(requestData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (response.ok) {
            const data = await response.json();
            console.log('SUCCESS! Response data:', data);
        } else {
            const errorText = await response.text();
            console.log('ERROR! Response:', errorText);
        }
    } catch (error) {
        console.error('FETCH ERROR:', error);
    }
}

// Run the test
testSummarizationAPI();