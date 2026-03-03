#!/usr/bin/env pwsh
# Build Single Service Script
# Usage: .\build-service.ps1 <service-name>
# Example: .\build-service.ps1 kairo-ui

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("kairo-ui", "client-management-api", "account-management-api", "systemcore-api")]
    [string]$Service,
    
    [switch]$NoPush
)

$ErrorActionPreference = "Stop"

# Service configuration
$serviceConfig = @{
    "kairo-ui" = @{
        Dockerfile = "kairo-ui/Dockerfile"
        Image = "jipheens/kairo-ui:latest"
        Name = "kairo-ui (Frontend)"
    }
    "systemcore-api" = @{
        Dockerfile = "SystemCoreApi/Dockerfile"
        Image = "jipheens/systemcore-api:latest"
        Name = "SystemCore API"
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
}

$config = $serviceConfig[$Service]

Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  BUILDING: $($config.Name.PadRight(38)) ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Building Docker image..." -ForegroundColor Yellow
Write-Host "  Dockerfile: $($config.Dockerfile)" -ForegroundColor Gray
Write-Host "  Image: $($config.Image)`n" -ForegroundColor Gray

try {
    docker build -f $config.Dockerfile -t $config.Image .
    Write-Host "`n✅ Build successful!" -ForegroundColor Green
    
    if (-not $NoPush) {
        Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Pushing to Docker Hub..." -ForegroundColor Yellow
        docker push $config.Image
        Write-Host "✅ Pushed successfully!" -ForegroundColor Green
        
        Write-Host "`n╔══════════════════════════════════════════════════╗" -ForegroundColor Green
        Write-Host "║  READY TO DEPLOY                                ║" -ForegroundColor Green
        Write-Host "╚══════════════════════════════════════════════════╝`n" -ForegroundColor Green
        
        Write-Host "📦 Image available: $($config.Image)" -ForegroundColor White
        Write-Host "`n🚀 Deploy on server:" -ForegroundColor Yellow
        Write-Host "   ssh kairo@172.17.50.15" -ForegroundColor White
        Write-Host "   cd /home/kairo/CoreBankingAPI" -ForegroundColor White
        Write-Host "   sudo docker-compose pull $Service" -ForegroundColor White
        Write-Host "   sudo docker-compose up -d --force-recreate $Service`n" -ForegroundColor White
    }
}
catch {
    Write-Host "`n❌ Build failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}
