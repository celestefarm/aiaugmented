# Wild Beaver Climb - Development Troubleshooting Guide

## 🚀 Quick Start (Recommended)

### Option 1: Use Startup Scripts (Easiest)
1. **Windows Batch File**: Double-click `start-dev.bat`
2. **PowerShell Script**: Right-click `start-dev.ps1` → "Run with PowerShell"

### Option 2: Manual Startup
```bash
# Terminal 1 - Backend
cd backend
python main.py

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

## 🔧 Common Issues & Solutions

### Issue 1: "localhost:5137 not loading"

**Symptoms:**
- Browser shows "This site can't be reached"
- Connection refused errors

**Root Cause:** Frontend development server not running

**Solution:**
```bash
cd frontend
npm run dev
```

**Prevention:** Use the startup scripts provided

---

### Issue 2: "Frontend loads but API calls fail"

**Symptoms:**
- Login page appears but shows errors in console
- 403 Forbidden or Connection Refused errors
- "Failed to fetch" errors

**Root Cause:** Backend server not running

**Solution:**
```bash
cd backend
python main.py
```

**Verification:** Backend should be accessible at http://localhost:8000

---

### Issue 3: "Port already in use" errors

**Symptoms:**
- `EADDRINUSE` errors
- Server fails to start

**Diagnosis:**
```bash
# Check what's using the ports
netstat -ano | findstr :5137
netstat -ano | findstr :8000
```

**Solutions:**
1. **Kill existing processes:**
   ```bash
   # Find process ID from netstat output, then:
   taskkill /PID <process_id> /F
   ```

2. **Change ports (if needed):**
   - Frontend: Edit `frontend/vite.config.ts` line 9
   - Backend: Edit `backend/main.py` line 77

---

### Issue 4: "npm run dev fails"

**Symptoms:**
- Command not found errors
- Module not found errors

**Solutions:**
1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

---

### Issue 5: "Python/Backend startup fails"

**Symptoms:**
- Module import errors
- Python not found errors

**Solutions:**
1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Check Python version:**
   ```bash
   python --version  # Should be 3.8+
   ```

3. **Use virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

---

## 🔍 Diagnostic Commands

### Check Server Status
```bash
# Check if ports are listening
netstat -ano | findstr :5137  # Frontend
netstat -ano | findstr :8000  # Backend

# Check running processes
tasklist | findstr node       # Frontend processes
tasklist | findstr python     # Backend processes
```

### Test Connectivity
```bash
# Test backend API
curl http://localhost:8000/api/v1/health

# Test frontend
curl http://localhost:5137
```

## 📋 Development Environment Checklist

### Prerequisites
- [ ] Node.js installed (v16+)
- [ ] Python installed (v3.8+)
- [ ] npm/yarn available
- [ ] pip available

### Project Setup
- [ ] Dependencies installed (`npm install` in frontend)
- [ ] Python packages installed (`pip install -r requirements.txt` in backend)
- [ ] Environment variables configured (if any)

### Server Status
- [ ] Frontend server running on port 5137
- [ ] Backend server running on port 8000
- [ ] No port conflicts
- [ ] Both servers accessible via browser/curl

## 🛠️ Advanced Troubleshooting

### Reset Development Environment
```bash
# Stop all servers
# Kill any node/python processes using ports 5137/8000

# Clean frontend
cd frontend
rm -rf node_modules package-lock.json
npm install

# Clean backend (if using venv)
cd backend
deactivate  # if in virtual env
rm -rf venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Restart servers
cd ..
# Use startup scripts or manual commands
```

### Check Configuration Files
- `frontend/vite.config.ts` - Frontend server config
- `frontend/src/lib/api.ts` - API endpoint configuration
- `backend/main.py` - Backend server config

### Environment Variables
Check if any `.env` files need to be configured:
- `frontend/.env`
- `backend/.env`

## 📞 Quick Reference

| Service | Port | URL | Config File |
|---------|------|-----|-------------|
| Frontend | 5137 | http://localhost:5137 | `frontend/vite.config.ts` |
| Backend | 8000 | http://localhost:8000 | `backend/main.py` |

## 🔄 Automation Scripts

### Available Scripts
- `start-dev.bat` - Windows batch file for easy startup
- `start-dev.ps1` - PowerShell script with port checking
- Manual commands in this guide

### Creating Your Own Scripts
You can create additional automation scripts for:
- Database setup/reset
- Environment cleanup
- Dependency updates
- Testing automation

## 💡 Pro Tips

1. **Always use the startup scripts** - They handle port checking and proper sequencing
2. **Keep terminals open** - Don't close the server terminal windows
3. **Check ports first** - Use `netstat` to diagnose port conflicts
4. **Use separate terminals** - Run frontend and backend in different terminals
5. **Monitor logs** - Watch the terminal output for errors
6. **Bookmark URLs** - Save http://localhost:5137 and http://localhost:8000

---

*Last updated: 2025-01-21*
*For additional help, check the project README.md or create an issue.*