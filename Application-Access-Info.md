# Application Access Information

## Localhost URLs

Based on the running terminals, your application is accessible at:

### Frontend Application
**URL**: `http://localhost:5173`
- **Service**: Vite development server (React frontend)
- **Status**: ✅ Running (Terminal 6 & 3)
- **Command**: `pnpm dev`

### Backend API
**URL**: `http://localhost:8000`
- **Service**: FastAPI backend server
- **Status**: ✅ Running (Terminal 1)
- **Command**: `python backend/main.py`

## How to Access the Strategist Agent

### Step 1: Open the Frontend
Navigate to: **`http://localhost:5173`**

### Step 2: Access the Exploration Map
- The main application should load
- Navigate to the Exploration Map page
- URL should be: **`http://localhost:5173/exploration-map`**

### Step 3: Interact with the Strategist Agent
1. **Left Sidebar**: You'll see the Agents panel with the Strategist Agent (already active by default)
2. **Right Sidebar**: You'll see the "Strategist Chat" interface
3. **Center Canvas**: Clean canvas ready for strategic mapping

### Step 4: Start a Conversation
1. Type a strategic question in the right sidebar chat input
2. Press Enter or click "Send Message"
3. The Strategist Agent will respond with strategic insights
4. Use "Add to Map" to convert insights into visual nodes

## Example Strategic Questions to Try

- "What are the key considerations for launching a new product?"
- "How should we approach international expansion?"
- "What strategic options do we have for increasing market share?"
- "How can we improve our competitive positioning?"

## Current Application Status

### ✅ Frontend (Port 5173)
- React application with Vite
- All layout fixes implemented
- Clean interface ready for use
- Responsive design working

### ✅ Backend (Port 8000)
- FastAPI server running
- Demo mode active (no authentication required)
- Mock data serving strategic agent responses

### ✅ Strategist Agent
- Active by default in left sidebar
- Chat interface ready in right sidebar
- Response system functional
- Map integration working

## Troubleshooting

If you can't access the application:

1. **Check Terminal Output**: Ensure both terminals show the services are running
2. **Frontend Issues**: Look for any errors in Terminal 6 or 3
3. **Backend Issues**: Check Terminal 1 for any Python/FastAPI errors
4. **Browser Cache**: Try refreshing the page or opening in incognito mode
5. **Port Conflicts**: Ensure ports 5173 and 8000 are not used by other applications

## Quick Test

To verify everything is working:
1. Go to `http://localhost:5173`
2. Navigate to the Exploration Map
3. Type "Hello" in the right sidebar chat
4. You should receive a strategic response from the Strategist Agent

The application is fully functional and ready for strategic conversations!