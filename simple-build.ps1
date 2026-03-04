#!/usr/bin/env pwsh
# Simple Build Script - No Dashboard, Just Works
# Usage: .\simple-build.ps1 <service-name>
# Example: .\simple-build.ps1 kairo-ui

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("kairo-ui", "account-management-api", "client-management-api", "systemcore-api", "all")]
    [string]$Service = "kairo-ui"
)

$ErrorActionPreference = "Stop"

# Service configuration
$services = @{
    "kairo-ui" = @{
        Dockerfile = "kairo-ui/Dockerfile"
        Image = "jipheens/kairo-ui:latest"
        Name = "Kairo UI (Frontend)"
    }
    "account-management-api" = @{
        Dockerfile = "AccountManagement/Dockerfile"
        Image = "jipheens/account-management-api:latest"
        Name = "Account Management API"
    }
    "client-management-api" = @{
        Dockerfile = "ClientManagement/Dockerfile"
        Image = "jipheens/client-management-api:latest"
        Name = "Client Management API"
    }
    "systemcore-api" = @{
        Dockerfile = "SystemCoreApi/Dockerfile"
        Image = "jipheens/systemcore-api:latest"
        Name = "SystemCore API"
    }
}

function Build-Service {
    param($ServiceKey)
    
    $config = $services[$ServiceKey]
    
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "  BUILDING: $($config.Name)" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Check if Dockerfile exists
    if (-not (Test-Path $config.Dockerfile)) {
        Write-Host "[ERROR] Dockerfile not found: $($config.Dockerfile)" -ForegroundColor Red
        return $false
    }
    
    # Build
    Write-Host "[1/2] Building Docker image..." -ForegroundColor Yellow
    Write-Host "      docker build -f $($config.Dockerfile) -t $($config.Image) ." -ForegroundColor Gray
    Write-Host ""
    
    docker build -f $config.Dockerfile -t $config.Image .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Build failed!" -ForegroundColor Red
        return $false
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Build completed!" -ForegroundColor Green
    Write-Host ""
    
    # Push
    Write-Host "[2/2] Pushing to Docker Hub..." -ForegroundColor Yellow
    Write-Host "      docker push $($config.Image)" -ForegroundColor Gray
    Write-Host ""
    
    docker push $config.Image
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[ERROR] Push failed!" -ForegroundColor Red
        Write-Host "[TIP] Make sure you're logged in: docker login" -ForegroundColor Yellow
        return $false
    }
    
    Write-Host ""
    Write-Host "[SUCCESS] Push completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host "  $($config.Name) - DONE!" -ForegroundColor Green
    Write-Host "======================================================" -ForegroundColor Green
    Write-Host ""
    
    return $true
}

# Main execution
Write-Host ""
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "  KAIRO BUILD SCRIPT" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""

if ($Service -eq "all") {
    Write-Host "Building ALL services..." -ForegroundColor Yellow
    Write-Host ""
    
    $results = @{}
    foreach ($key in $services.Keys) {
        $results[$key] = Build-Service $key
    }
    
    Write-Host ""
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host "  BUILD SUMMARY" -ForegroundColor Cyan
    Write-Host "======================================================" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($key in $results.Keys) {
        $status = if ($results[$key]) { "[SUCCESS]" } else { "[FAILED]" }
        $color = if ($results[$key]) { "Green" } else { "Red" }
        Write-Host "  $status $($services[$key].Name)" -ForegroundColor $color
    }
    Write-Host ""
} else {
    $success = Build-Service $Service
    
    if ($success) {
        Write-Host "Next step: Deploy on server" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  ssh kairo@172.17.50.15" -ForegroundColor White
        Write-Host "  cd /home/kairo/CoreBankingAPI" -ForegroundColor White
        Write-Host "  sudo docker-compose pull $Service" -ForegroundColor White
        Write-Host "  sudo docker-compose up -d --force-recreate $Service" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "Build failed. Please fix errors above and try again." -ForegroundColor Red
        exit 1
    }
}
