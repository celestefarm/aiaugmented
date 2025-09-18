# Frontend Server Restart Guide

## Step-by-Step Instructions

### Step 1: Stop Both Frontend Terminals

1. **Click on Terminal 6** (in VS Code terminal panel)
2. **Press `Ctrl+C`** to stop the server
3. **Wait for the command prompt** to return (you'll see `PS C:\Users\mscle\Desktop\snapdev-apps\wild-beaver-climb_usama\frontend>`)

4. **Click on Terminal 3** (in VS Code terminal panel)  
5. **Press `Ctrl+C`** to stop the server
6. **Wait for the command prompt** to return

### Step 2: Close One Terminal (Optional but Recommended)

1. **Right-click on Terminal 3** tab
2. **Select "Kill Terminal"** to close it
3. **Keep only Terminal 6** for the frontend

### Step 3: Restart Frontend Server

1. **Make sure you're in Terminal 6**
2. **Verify you're in the frontend directory** (should show: `PS C:\Users\mscle\Desktop\snapdev-apps\wild-beaver-climb_usama\frontend>`)
3. **Run the command**: `pnpm dev`

### Step 4: Look for Success Message

After running `pnpm dev`, you should see output like:
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

### Step 5: Test in Browser

1. **Copy the exact URL** from the "Local:" line (usually `http://localhost:5173/`)
2. **Open your browser**
3. **Paste the URL** and press Enter
4. **You should see** the application loading successfully

## What to Expect

✅ **Success**: You'll see the Exploration Map with:
- Left sidebar: Agents panel with Strategist Agent
- Center: Clean canvas area
- Right sidebar: Strategist Chat interface

❌ **If it still doesn't work**: Let me know what error messages you see in the terminal

## Troubleshooting

If you see any error messages during startup, please share them so I can help diagnose the issue.

Common issues:
- Port already in use (we'll try a different port)
- Missing dependencies (we'll reinstall them)
- Configuration errors (we'll fix the config)