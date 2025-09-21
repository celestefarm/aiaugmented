# Wild Beaver Climb Development Environment Startup Script
# PowerShell version for better Windows compatibility

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting Wild Beaver Climb Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "frontend")) {
    Write-Host "ERROR: frontend directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "backend")) {
    Write-Host "ERROR: backend directory not found!" -ForegroundColor Red
    Write-Host "Please run this script from the project root directory." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("localhost", $Port)
        $connection.Close()
        return $true
    }
    catch {
        return $false
    }
}

# Check if ports are already in use
Write-Host "Checking ports..." -ForegroundColor Yellow

if (Test-Port 8000) {
    Write-Host "WARNING: Port 8000 is already in use!" -ForegroundColor Yellow
    Write-Host "Backend server may already be running or another service is using this port." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

if (Test-Port 5137) {
    Write-Host "WARNING: Port 5137 is already in use!" -ForegroundColor Yellow
    Write-Host "Frontend server may already be running or another service is using this port." -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
}

Write-Host "Starting Backend Server (Port 8000)..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd backend && python main.py" -WindowStyle Normal

Write-Host "Waiting 3 seconds for backend to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting Frontend Server (Port 5137)..." -ForegroundColor Green
Start-Process -FilePath "cmd" -ArgumentList "/k", "cd frontend && npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Development Environment Started!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host " Frontend: http://localhost:5137" -ForegroundColor White
Write-Host " Backend:  http://localhost:8000" -ForegroundColor White
Write-Host ""
Write-Host " Both servers are running in separate windows." -ForegroundColor Yellow
Write-Host " Close those windows to stop the servers." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Wait for user input before closing
Read-Host "Press Enter to close this window"