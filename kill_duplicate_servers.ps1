# Kill all Python processes running on port 8000
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cleaning Up Duplicate Backend Servers" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Find all processes listening on port 8000
$port8000Processes = netstat -ano | Select-String ":8000.*LISTENING"

if ($port8000Processes) {
    Write-Host "Found processes on port 8000:" -ForegroundColor Yellow
    $port8000Processes | ForEach-Object {
        Write-Host $_ -ForegroundColor Gray
    }
    
    # Extract unique PIDs
    $pids = $port8000Processes | ForEach-Object {
        $_ -match '\s+(\d+)\s*$' | Out-Null
        $matches[1]
    } | Select-Object -Unique
    
    Write-Host ""
    Write-Host "Killing $($pids.Count) process(es)..." -ForegroundColor Yellow
    
    foreach ($pid in $pids) {
        try {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "  Killing process $pid ($($process.ProcessName))..." -ForegroundColor Red
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            }
        }
        catch {
            Write-Host "  Failed to kill process $pid" -ForegroundColor Red
        }
    }
    
    Start-Sleep -Seconds 2
    
    # Verify
    $remaining = netstat -ano | Select-String ":8000.*LISTENING"
    if ($remaining) {
        Write-Host ""
        Write-Host "Warning: Some processes still running on port 8000" -ForegroundColor Red
        $remaining | ForEach-Object { Write-Host $_ -ForegroundColor Gray }
    } else {
        Write-Host ""
        Write-Host "✓ Port 8000 is now clear!" -ForegroundColor Green
    }
}
else {
    Write-Host "No processes found on port 8000" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Cleanup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You can now start the development servers using:" -ForegroundColor Yellow
Write-Host "  .\start-dev.bat" -ForegroundColor White
Write-Host ""



