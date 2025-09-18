# Localhost Troubleshooting Guide

## Issue: Localhost Not Loading

Based on the terminal information, both servers should be running, but you're unable to access the application. Let's troubleshoot this step by step.

## Step 1: Check Terminal Output

### Frontend Server (Terminal 6 & 3)
**Command**: `pnpm dev`
**Expected Output**: Should show something like:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
  ➜  press h to show help
```

### Backend Server (Terminal 1)
**Command**: `python backend/main.py`
**Expected Output**: Should show something like:
```
INFO:     Started server process [xxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

## Step 2: Common Issues and Solutions

### Issue A: Port Already in Use
**Symptoms**: Error messages about port 5173 or 8000 being in use
**Solution**: 
1. Kill existing processes using those ports
2. Or use different ports by modifying the commands

### Issue B: Dependencies Not Installed
**Symptoms**: Module not found errors, import errors
**Solution**:
```bash
# In frontend directory
cd frontend
pnpm install

# In backend directory  
cd backend
pip install -r requirements.txt
```

### Issue C: Environment Issues
**Symptoms**: Various startup errors
**Solution**: Check if all required environment variables are set

### Issue D: Firewall/Network Issues
**Symptoms**: Connection refused, timeout errors
**Solution**: 
1. Try `http://127.0.0.1:5173` instead of `localhost:5173`
2. Check Windows Firewall settings
3. Try different browser

## Step 3: Manual Restart Process

If the servers aren't working properly, try restarting them:

### Restart Frontend:
1. In Terminal 6 or 3, press `Ctrl+C` to stop the current process
2. Run: `cd frontend` (if not already there)
3. Run: `pnpm dev`
4. Wait for the "Local: http://localhost:5173/" message

### Restart Backend:
1. In Terminal 1, press `Ctrl+C` to stop the current process
2. Run: `cd backend` (if not already there) 
3. Run: `python main.py`
4. Wait for the "Uvicorn running on http://127.0.0.1:8000" message

## Step 4: Alternative Access Methods

### Try Different URLs:
- `http://127.0.0.1:5173` (instead of localhost:5173)
- `http://localhost:5173`
- Check if the terminal shows a different port number

### Try Different Browsers:
- Chrome
- Firefox
- Edge
- Incognito/Private mode

## Step 5: Check for Specific Errors

### Frontend Errors to Look For:
- "EADDRINUSE" - Port already in use
- "Module not found" - Missing dependencies
- "Permission denied" - File access issues
- Build errors - Code compilation issues

### Backend Errors to Look For:
- "Address already in use" - Port conflict
- "ModuleNotFoundError" - Missing Python packages
- "Permission denied" - File/directory access issues
- Import errors - Code issues

## Step 6: Quick Diagnostic Commands

Run these commands to check the current status:

### Check if ports are in use:
```bash
# Windows
netstat -an | findstr :5173
netstat -an | findstr :8000

# Alternative
tasklist | findstr node
tasklist | findstr python
```

### Check current directory:
```bash
pwd
ls -la
```

## Step 7: Fresh Start Procedure

If nothing else works, try a complete restart:

1. **Stop all processes**: Press `Ctrl+C` in all terminals
2. **Close all terminals**
3. **Open new terminals**
4. **Navigate to project directory**: `cd c:\Users\mscle\Desktop\snapdev-apps\wild-beaver-climb_usama`
5. **Start backend**: 
   ```bash
   cd backend
   python main.py
   ```
6. **Start frontend** (in new terminal):
   ```bash
   cd frontend  
   pnpm dev
   ```

## Step 8: What to Check in Browser

When you try to access `http://localhost:5173`:

### If you see a blank page:
- Check browser console (F12) for JavaScript errors
- Try refreshing the page
- Clear browser cache

### If you see "This site can't be reached":
- Server isn't running properly
- Port is blocked
- Wrong URL

### If you see error messages:
- Note the exact error message
- Check terminal output for corresponding errors

## Next Steps

Please check your terminal output and let me know:
1. What exact messages you see in Terminal 1 (backend)
2. What exact messages you see in Terminal 6/3 (frontend)
3. What error message (if any) you see in the browser
4. What URL you're trying to access

This will help me provide more specific troubleshooting steps.