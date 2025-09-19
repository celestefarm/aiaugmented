// Test to simulate the exact frontend login flow
const API_BASE_URL = 'http://localhost:8000/api/v1';

async function testFrontendLoginFlow() {
    console.log('=== FRONTEND LOGIN SIMULATION ===');
    
    const loginData = {
        email: 'celeste.fcp@gmail.com',
        password: 'celeste060291'
    };
    
    console.log('Login data:', loginData);
    
    try {
        // Simulate the exact frontend request
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                detail: `HTTP ${response.status}: ${response.statusText}`,
            }));
            console.log('API Error:', errorData);
            throw new Error(errorData.detail);
        }
        
        const jsonResponse = await response.json();
        console.log('Raw login response:', jsonResponse);
        
        // Simulate the frontend ID fix logic
        if (jsonResponse.user && jsonResponse.user._id) {
            console.log('Original user._id:', jsonResponse.user._id);
            jsonResponse.user.id = jsonResponse.user._id;
            console.log('Fixed user.id:', jsonResponse.user.id);
        }
        
        console.log('Final response user:', jsonResponse.user);
        
        // Simulate token storage
        if (jsonResponse.access_token) {
            console.log('✅ Token would be stored:', jsonResponse.access_token.substring(0, 20) + '...');
        }
        
        console.log('✅ FRONTEND SIMULATION SUCCESS');
        return jsonResponse;
        
    } catch (error) {
        console.error('❌ FRONTEND SIMULATION FAILED:', error);
        throw error;
    }
}

// Run the test
testFrontendLoginFlow()
    .then(() => console.log('Test completed successfully'))
    .catch(error => console.error('Test failed:', error));