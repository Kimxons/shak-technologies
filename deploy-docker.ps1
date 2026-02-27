# ==============================================================================
# KAIRO Docker Build and Deployment Script (PowerShell)
# ==============================================================================
# This script builds Docker images for all KAIRO services and deploys them
# to the production server at 172.17.50.15
# ==============================================================================

$ErrorActionPreference = "Stop"

# Configuration
$DOCKER_REGISTRY = "jipheens"
$SERVER_USER = "kairo"
$SERVER_HOST = "172.17.50.15"
$SERVER_PATH = "/home/kairo/CoreBankingAPI"
$VERSION_TAG = Get-Date -Format "yyyyMMdd-HHmmss"

Write-Host "================================================" -ForegroundColor Blue
Write-Host "  KAIRO Docker Build & Deployment Script" -ForegroundColor Blue
Write-Host "================================================" -ForegroundColor Blue
Write-Host ""

# ==============================================================================
# Function: Build Docker Image
# ==============================================================================
function Build-DockerImage {
    param(
        [string]$ServiceName,
        [string]$DockerfilePath
    )

    $imageName = "${DOCKER_REGISTRY}/${ServiceName}:latest"
    $versionedImage = "${DOCKER_REGISTRY}/${ServiceName}:${VERSION_TAG}"

    Write-Host "→ Building $ServiceName..." -ForegroundColor Yellow
    
    docker build `
        -f $DockerfilePath `
        -t $imageName `
        -t $versionedImage `
        . 
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to build $ServiceName" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Built $ServiceName successfully" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================================
# Function: Push Docker Image
# ==============================================================================
function Push-DockerImage {
    param(
        [string]$ServiceName
    )

    $imageName = "${DOCKER_REGISTRY}/${ServiceName}:latest"
    $versionedImage = "${DOCKER_REGISTRY}/${ServiceName}:${VERSION_TAG}"

    Write-Host "→ Pushing $ServiceName to Docker Hub..." -ForegroundColor Yellow
    
    docker push $imageName
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to push $ServiceName" -ForegroundColor Red
        exit 1
    }
    
    docker push $versionedImage
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Failed to push $ServiceName versioned" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✓ Pushed $ServiceName successfully" -ForegroundColor Green
    Write-Host ""
}

# ==============================================================================
# Step 1: Build All Images
# ==============================================================================
Write-Host "Step 1: Building Docker Images" -ForegroundColor Blue
Write-Host ""

Build-DockerImage "kairo-ui" "kairo-ui/Dockerfile"
Build-DockerImage "account-management-api" "AccountManagement/Dockerfile"
Build-DockerImage "client-management-api" "ClientManagement/Dockerfile"
Build-DockerImage "systemcore-api" "SystemCoreApi/Dockerfile"

Write-Host "✓ All images built successfully!" -ForegroundColor Green
Write-Host ""

# ==============================================================================
# Step 2: Push Images to Docker Hub
# ==============================================================================
$pushResponse = Read-Host "Do you want to push images to Docker Hub? (y/n)"
if ($pushResponse -eq "y" -or $pushResponse -eq "Y") {
    Write-Host "Step 2: Pushing Images to Docker Hub" -ForegroundColor Blue
    Write-Host ""
    
    Write-Host "→ Logging in to Docker Hub..." -ForegroundColor Yellow
    docker login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Docker login failed" -ForegroundColor Red
        exit 1
    }
    
    Push-DockerImage "kairo-ui"
    Push-DockerImage "account-management-api"
    Push-DockerImage "client-management-api"
    Push-DockerImage "systemcore-api"
    
    Write-Host "✓ All images pushed successfully!" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "⊘ Skipping Docker Hub push" -ForegroundColor Yellow
    Write-Host ""
}

# ==============================================================================
# Step 3: Transfer Configuration Files to Server
# ==============================================================================
Write-Host "Step 3: Transferring Configuration Files to Server" -ForegroundColor Blue
Write-Host ""

Write-Host "→ Copying docker-compose.yml..." -ForegroundColor Yellow
scp docker-compose.new.yml "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/docker-compose.yml"

Write-Host "→ Copying nginx.conf..." -ForegroundColor Yellow
scp nginx.new.conf "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/nginx.conf"

Write-Host "✓ Configuration files transferred" -ForegroundColor Green
Write-Host ""

# ==============================================================================
# Step 4: Deploy to Server
# ==============================================================================
$deployResponse = Read-Host "Do you want to deploy to the server now? (y/n)"
if ($deployResponse -eq "y" -or $deployResponse -eq "Y") {
    Write-Host "Step 4: Deploying to Server" -ForegroundColor Blue
    Write-Host ""
    
    $deployScript = @"
        set -e
        cd /home/kairo/CoreBankingAPI
        
        echo '→ Pulling latest images...'
        docker-compose pull kairo-ui client-management-api account-management-api systemcore-api
        
        echo '→ Stopping old containers...'
        docker-compose stop kairo_frontend client-maintenance account-maintenance || true
        
        echo '→ Removing old containers...'
        docker-compose rm -f kairo_frontend client-maintenance account-maintenance || true
        
        echo '→ Starting new services...'
        docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api
        
        echo '→ Restarting nginx proxy...'
        docker-compose restart nginx-proxy
        
        echo '→ Checking service status...'
        docker-compose ps
        
        echo ''
        echo '✓ Deployment completed!'
"@
    
    ssh "${SERVER_USER}@${SERVER_HOST}" $deployScript
    
    Write-Host "✓ Successfully deployed to ${SERVER_HOST}!" -ForegroundColor Green
    Write-Host ""
    
    # Show logs
    $logsResponse = Read-Host "Do you want to view logs? (y/n)"
    if ($logsResponse -eq "y" -or $logsResponse -eq "Y") {
        ssh "${SERVER_USER}@${SERVER_HOST}" "cd ${SERVER_PATH} && docker-compose logs -f --tail=50 kairo-ui"
    }
} else {
    Write-Host "⊘ Skipping deployment" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Deployment Process Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Service URLs:" -ForegroundColor Cyan
Write-Host "  • Main UI:              https://kairo.craftsilicon.com"
Write-Host "  • IAM API:              http://172.17.50.15:3309"
Write-Host "  • Client Management:    http://172.17.50.15:3306"
Write-Host "  • Account Management:   http://172.17.50.15:3307"
Write-Host "  • System Core API:      http://172.17.50.15:3311"
Write-Host "  • IAM Web Client:       http://172.17.50.15:3310"
Write-Host ""
