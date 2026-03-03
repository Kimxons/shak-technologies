#!/usr/bin/env pwsh
# Fix Port Conflict
# This script helps resolve port 8888 conflicts

Write-Host ""
Write-Host "======================================================" -ForegroundColor Red
Write-Host "  PORT CONFLICT RESOLVER" -ForegroundColor Red
Write-Host "======================================================" -ForegroundColor Red
Write-Host ""

# Find what's using port 8888
Write-Host "Finding what's using port 8888..." -ForegroundColor Yellow
Write-Host ""

$connections = Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue

if ($connections) {
    Write-Host "Port 8888 is being used by:" -ForegroundColor Red
    Write-Host ""
    
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  Process: $($process.Name)" -ForegroundColor Yellow
            Write-Host "  PID: $($process.Id)" -ForegroundColor Gray
            Write-Host "  Path: $($process.Path)" -ForegroundColor Gray
            Write-Host ""
        }
    }
    
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "  SOLUTIONS" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "[Option 1] Stop the conflicting process:" -ForegroundColor Yellow
    Write-Host ""
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "  Stop-Process -Id $($process.Id) -Force" -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "[Option 2] Use a different port (recommended):" -ForegroundColor Yellow
    Write-Host "  1. Open: start-build-dashboard.ps1" -ForegroundColor White
    Write-Host "  2. Change line 13: `$port = 8888" -ForegroundColor White
    Write-Host "  3. To: `$port = 9999" -ForegroundColor White
    Write-Host ""
    
    Write-Host "[Option 3] Let me do it automatically:" -ForegroundColor Green
    Write-Host ""
    $answer = Read-Host "Change port to 9999 automatically? (Y/N)"
    
    if ($answer -eq "Y" -or $answer -eq "y") {
        # Read the file
        $scriptPath = "start-build-dashboard.ps1"
        $content = Get-Content $scriptPath -Raw
        
        # Replace port
        $newContent = $content -replace '\$port = 8888', '$port = 9999'
        
        # Write back
        Set-Content $scriptPath -Value $newContent -Encoding UTF8
        
        Write-Host ""
        Write-Host "[SUCCESS] Port changed to 9999!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now run:" -ForegroundColor Yellow
        Write-Host "  .\start-build-dashboard.ps1" -ForegroundColor White
        Write-Host ""
        Write-Host "Or double-click: START_BUILD_DASHBOARD.bat" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "No changes made. Please choose one of the options above." -ForegroundColor Yellow
    }
    
} else {
    Write-Host "[OK] Port 8888 is available!" -ForegroundColor Green
    Write-Host ""
    Write-Host "The error might be from a lingering registration." -ForegroundColor Yellow
    Write-Host "Try running as Administrator or restart your computer." -ForegroundColor Yellow
}

Write-Host ""
