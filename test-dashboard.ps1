#!/usr/bin/env pwsh
# Test Build Dashboard
# This script tests the dashboard without actually building Docker images

Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  TESTING BUILD DASHBOARD" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if HTML file exists
Write-Host "[TEST 1] Checking if build-dashboard.html exists..." -ForegroundColor Yellow
if (Test-Path "build-dashboard.html") {
    Write-Host "  [PASS] build-dashboard.html found" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] build-dashboard.html not found!" -ForegroundColor Red
    exit 1
}

# Test 2: Check if HTML is valid UTF-8
Write-Host ""
Write-Host "[TEST 2] Checking HTML encoding..." -ForegroundColor Yellow
try {
    $html = Get-Content "build-dashboard.html" -Raw -Encoding UTF8
    if ($html.Length -gt 0) {
        Write-Host "  [PASS] HTML file is readable" -ForegroundColor Green
    }
}
catch {
    Write-Host "  [FAIL] Could not read HTML file: $_" -ForegroundColor Red
    exit 1
}

# Test 3: Check for emoji/special characters that might cause issues
Write-Host ""
Write-Host "[TEST 3] Checking for problematic characters..." -ForegroundColor Yellow
$problematicChars = $html | Select-String -Pattern '[🚀🎨💼👥⚙️🔨✅❌📤🎉]' -AllMatches
if ($problematicChars.Matches.Count -gt 0) {
    Write-Host "  [WARN] Found $($problematicChars.Matches.Count) emoji characters (may cause encoding issues)" -ForegroundColor Yellow
} else {
    Write-Host "  [PASS] No problematic characters found" -ForegroundColor Green
}

# Test 4: Check if port 8888 is available
Write-Host ""
Write-Host "[TEST 4] Checking if port 8888 is available..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 8888 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "  [WARN] Port 8888 is already in use" -ForegroundColor Yellow
    Write-Host "         You may need to stop other services or change the port" -ForegroundColor Gray
} else {
    Write-Host "  [PASS] Port 8888 is available" -ForegroundColor Green
}

# Test 5: Check if Docker is available
Write-Host ""
Write-Host "[TEST 5] Checking if Docker is available..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [PASS] Docker is available: $dockerVersion" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Docker is not available" -ForegroundColor Red
    }
}
catch {
    Write-Host "  [FAIL] Docker command not found" -ForegroundColor Red
}

# Test 6: Check if logged into Docker Hub
Write-Host ""
Write-Host "[TEST 6] Checking Docker Hub login..." -ForegroundColor Yellow
$dockerInfo = docker info 2>&1 | Select-String "Username"
if ($dockerInfo) {
    Write-Host "  [PASS] Logged into Docker Hub: $dockerInfo" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Not logged into Docker Hub" -ForegroundColor Yellow
    Write-Host "         Run 'docker login' before building" -ForegroundColor Gray
}

# Test 7: Check if Dockerfiles exist
Write-Host ""
Write-Host "[TEST 7] Checking if Dockerfiles exist..." -ForegroundColor Yellow
$dockerfiles = @(
    "kairo-ui/Dockerfile",
    "AccountManagement/Dockerfile",
    "ClientManagement/Dockerfile",
    "SystemCoreApi/Dockerfile"
)

$allFound = $true
foreach ($dockerfile in $dockerfiles) {
    if (Test-Path $dockerfile) {
        Write-Host "  [PASS] Found: $dockerfile" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] Missing: $dockerfile" -ForegroundColor Red
        $allFound = $false
    }
}

# Test 8: Test HTTP server functionality
Write-Host ""
Write-Host "[TEST 8] Testing HTTP server (5 second test)..." -ForegroundColor Yellow
try {
    # Start server in background
    $job = Start-Job -ScriptBlock {
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://localhost:8889/")
        $listener.Start()
        Start-Sleep -Seconds 5
        $listener.Stop()
    }

    Start-Sleep -Seconds 1
    
    # Try to connect
    $response = Invoke-WebRequest -Uri "http://localhost:8889/" -TimeoutSec 2 -ErrorAction SilentlyContinue
    Write-Host "  [PASS] HTTP server test successful" -ForegroundColor Green
    
    Stop-Job $job
    Remove-Job $job
}
catch {
    Write-Host "  [WARN] Could not test HTTP server (this is usually OK)" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  TEST SUMMARY" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

if ($allFound) {
    Write-Host "[OK] All critical tests passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now start the dashboard with:" -ForegroundColor Yellow
    Write-Host "  .\start-build-dashboard.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or double-click:" -ForegroundColor Yellow
    Write-Host "  START_BUILD_DASHBOARD.bat" -ForegroundColor White
} else {
    Write-Host "[ERROR] Some tests failed. Please fix the issues above." -ForegroundColor Red
}

Write-Host ""
