@echo off
echo ========================================
echo  Starting Wild Beaver Climb Development Environment
echo ========================================
echo.

REM Check if we're in the correct directory
if not exist "frontend" (
    echo ERROR: frontend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

if not exist "backend" (
    echo ERROR: backend directory not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo Starting Backend Server (Port 8000)...
start "Backend Server" cmd /k "cd backend && python main.py"

echo Waiting 3 seconds for backend to initialize...
timeout /t 3 /nobreak >nul

echo Starting Frontend Server (Port 5137)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo  Development Environment Started!
echo ========================================
echo  Frontend: http://localhost:5137
echo  Backend:  http://localhost:8000
echo  
echo  Both servers are running in separate windows.
echo  Close those windows to stop the servers.
echo ========================================
echo.
pause