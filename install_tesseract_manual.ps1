# Manual Tesseract OCR Installation Script
# Run this script as Administrator if automatic installations fail

Write-Host "=== Tesseract OCR Manual Installation ===" -ForegroundColor Green

# Check if already installed
try {
    $version = tesseract --version 2>$null
    if ($version) {
        Write-Host "✅ Tesseract is already installed: $version" -ForegroundColor Green
        exit 0
    }
} catch {
    Write-Host "❌ Tesseract not found in PATH, proceeding with installation..." -ForegroundColor Yellow
}

# Create temp directory
$tempDir = "$env:TEMP\tesseract_install"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
Set-Location $tempDir

Write-Host "📥 Downloading Tesseract OCR installer..." -ForegroundColor Blue

# Download Tesseract installer
$url = "https://github.com/UB-Mannheim/tesseract/releases/download/v5.3.3.20231005/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
$installer = "tesseract-installer.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $installer -UseBasicParsing
    Write-Host "✅ Download completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please download manually from: $url" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Running installer..." -ForegroundColor Blue
Write-Host "Please follow the installation wizard and install to: C:\Program Files\Tesseract-OCR\" -ForegroundColor Yellow

# Run installer
Start-Process -FilePath $installer -Wait

# Check installation
$tesseractPath = "C:\Program Files\Tesseract-OCR\tesseract.exe"
if (Test-Path $tesseractPath) {
    Write-Host "✅ Tesseract installed successfully" -ForegroundColor Green
    
    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")
    $tesseractDir = "C:\Program Files\Tesseract-OCR"
    
    if ($currentPath -notlike "*$tesseractDir*") {
        Write-Host "📝 Adding Tesseract to system PATH..." -ForegroundColor Blue
        [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$tesseractDir", "Machine")
        Write-Host "✅ PATH updated" -ForegroundColor Green
    }
    
    # Refresh current session PATH
    $env:PATH += ";$tesseractDir"
    
    # Test installation
    try {
        $version = & $tesseractPath --version
        Write-Host "✅ Installation verified: $version" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Installation completed but verification failed" -ForegroundColor Yellow
    }
    
} else {
    Write-Host "❌ Installation failed - Tesseract not found at expected location" -ForegroundColor Red
    exit 1
}

# Cleanup
Set-Location $env:USERPROFILE
Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue

Write-Host "" -ForegroundColor White
Write-Host "=== Next Steps ===" -ForegroundColor Green
Write-Host "1. Restart your terminal/PowerShell session" -ForegroundColor White
Write-Host "2. Restart the backend server: cd backend && python main.py" -ForegroundColor White
Write-Host "3. Test image upload in the application" -ForegroundColor White
Write-Host "4. Verify OCR results appear in the frontend" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "✅ Tesseract OCR installation completed!" -ForegroundColor Green