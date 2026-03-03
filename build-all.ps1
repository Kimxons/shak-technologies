#!/usr/bin/env pwsh
# Build All Services Script
# Usage: .\build-all.ps1

param(
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BUILDING ALL KAIRO SERVICES                    ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Define services
$services = @(
    @{Name="kairo-ui"; Dockerfile="kairo-ui/Dockerfile"; Image="jipheens/kairo-ui:latest"},
    @{Name="SystemCore API"; Dockerfile="SystemCoreApi/Dockerfile"; Image="jipheens/systemcore-api:latest"},
    @{Name="Account Management API"; Dockerfile="AccountManagement/Dockerfile"; Image="jipheens/account-management-api:latest"},
    @{Name="Client Management API"; Dockerfile="ClientManagement/Dockerfile"; Image="jipheens/client-management-api:latest"}
)

$buildResults = @()

foreach ($svc in $services) {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Building $($svc.Name)..." -ForegroundColor Yellow
    
    try {
        docker build -f $svc.Dockerfile -t $svc.Image . 2>&1 | Out-Null
        $buildResults += @{Service=$svc.Name; Status="✅ Success"; Image=$svc.Image}
        Write-Host "  ✅ Build successful: $($svc.Name)" -ForegroundColor Green
    }
    catch {
        $buildResults += @{Service=$svc.Name; Status="❌ Failed"; Image=$svc.Image}
        Write-Host "  ❌ Build failed: $($svc.Name)" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
    }
}

if (-not $NoPush) {
    Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║  PUSHING TO DOCKER HUB                          ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Green

    foreach ($result in $buildResults) {
        if ($result.Status -eq "✅ Success") {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Pushing $($result.Service)..." -ForegroundColor Yellow
            try {
                docker push $result.Image 2>&1 | Out-Null
                Write-Host "  ✅ Pushed: $($result.Service)" -ForegroundColor Green
            }
            catch {
                Write-Host "  ❌ Push failed: $($result.Service)" -ForegroundColor Red
            }
        }
    }
}

Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BUILD SUMMARY                                  ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

foreach ($result in $buildResults) {
    Write-Host "  $($result.Status) $($result.Service)"
}

Write-Host "`n📦 Images ready on Docker Hub!" -ForegroundColor Green
Write-Host "`n🚀 Next: Deploy on server using:" -ForegroundColor Yellow
Write-Host "   ssh kairo@172.17.50.15" -ForegroundColor White
Write-Host "   cd /home/kairo/CoreBankingAPI" -ForegroundColor White
Write-Host "   sudo docker-compose pull" -ForegroundColor White
Write-Host "   sudo docker-compose up -d --force-recreate`n" -ForegroundColor White
