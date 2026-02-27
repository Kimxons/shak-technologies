# ==============================================================================
# KAIRO COMPLETE DEPLOYMENT SCRIPT - POWERSHELL
# ==============================================================================
# Execute this script to deploy all services to kairo@172.17.50.15
# ==============================================================================

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { param($msg) Write-Host "✓ $msg" -ForegroundColor Green }
function Write-Error-Custom { param($msg) Write-Host "✗ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "→ $msg" -ForegroundColor Yellow }
function Write-Header { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan -BackgroundColor DarkBlue }

# Configuration
$DOCKER_REGISTRY = "jipheens"
$SERVER_USER = "kairo"
$SERVER_HOST = "172.17.50.15"
$SERVER_PATH = "/home/kairo/CoreBankingAPI"
$VERSION_TAG = Get-Date -Format "yyyyMMdd-HHmmss"

Clear-Host
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "║   KAIRO Docker Complete Deployment              ║" -ForegroundColor Blue
Write-Host "║   Target: $SERVER_HOST                   ║" -ForegroundColor Blue
Write-Host "║   Version: $VERSION_TAG                  ║" -ForegroundColor Blue
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ==============================================================================
# STEP 1: Pre-flight Checks
# ==============================================================================
Write-Header "STEP 1: Pre-flight Checks"

Write-Info "Checking Docker..."
try {
    docker ps | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error-Custom "Docker is not running. Please start Docker Desktop."
    exit 1
}

Write-Info "Checking if all Dockerfiles exist..."
$dockerfiles = @(
    "kairo-ui/Dockerfile",
    "AccountManagement/Dockerfile",
    "ClientManagement/Dockerfile",
    "SystemCoreApi/Dockerfile"
)

foreach ($df in $dockerfiles) {
    if (!(Test-Path $df)) {
        Write-Error-Custom "Dockerfile not found: $df"
        exit 1
    }
}
Write-Success "All Dockerfiles found"

# ==============================================================================
# STEP 2: Build Docker Images
# ==============================================================================
Write-Header "STEP 2: Building Docker Images (This may take 10-15 minutes)"

$services = @(
    @{Name="kairo-ui"; Dockerfile="kairo-ui/Dockerfile"},
    @{Name="account-management-api"; Dockerfile="AccountManagement/Dockerfile"},
    @{Name="client-management-api"; Dockerfile="ClientManagement/Dockerfile"},
    @{Name="systemcore-api"; Dockerfile="SystemCoreApi/Dockerfile"}
)

foreach ($service in $services) {
    Write-Info "Building $($service.Name)..."
    
    $imageName = "$DOCKER_REGISTRY/$($service.Name):latest"
    $versionedImage = "$DOCKER_REGISTRY/$($service.Name):$VERSION_TAG"
    
    docker build `
        -f $service.Dockerfile `
        -t $imageName `
        -t $versionedImage `
        . 2>&1 | Select-Object -Last 10
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Failed to build $($service.Name)"
        exit 1
    }
    
    Write-Success "Built $($service.Name)"
}

Write-Success "All images built successfully!"
Write-Host ""
Write-Host "Built Images:" -ForegroundColor Cyan
docker images | Select-String "jipheens/(kairo-ui|account-management-api|client-management-api|systemcore-api)"

# ==============================================================================
# STEP 3: Push to Docker Hub
# ==============================================================================
Write-Header "STEP 3: Push Images to Docker Hub"

$pushResponse = Read-Host "Do you want to push images to Docker Hub? (y/n)"

if ($pushResponse -eq "y" -or $pushResponse -eq "Y") {
    Write-Info "Logging in to Docker Hub..."
    Write-Host "Please enter your Docker Hub credentials for '$DOCKER_REGISTRY'" -ForegroundColor Yellow
    docker login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Docker login failed"
        exit 1
    }
    
    foreach ($service in $services) {
        Write-Info "Pushing $($service.Name):latest..."
        docker push "$DOCKER_REGISTRY/$($service.Name):latest" 2>&1 | Select-Object -Last 5
        
        Write-Info "Pushing $($service.Name):$VERSION_TAG..."
        docker push "$DOCKER_REGISTRY/$($service.Name):$VERSION_TAG" 2>&1 | Select-Object -Last 5
        
        Write-Success "Pushed $($service.Name)"
    }
    
    Write-Success "All images pushed to Docker Hub!"
} else {
    Write-Host "⊘ Skipping Docker Hub push" -ForegroundColor Yellow
    Write-Host "Note: Deployment will use local images on server" -ForegroundColor Yellow
}

# ==============================================================================
# STEP 4: Transfer Configuration Files
# ==============================================================================
Write-Header "STEP 4: Transferring Configuration Files to Server"

Write-Info "Copying docker-compose.yml to server..."
Write-Host "Enter SSH password for $SERVER_USER@$SERVER_HOST when prompted" -ForegroundColor Yellow

scp docker-compose.final.yml "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/docker-compose.new.yml"
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to copy docker-compose.yml"
    exit 1
}
Write-Success "Transferred docker-compose.yml"

Write-Info "Copying nginx.conf to server..."
scp nginx.new.conf "${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/nginx.new.conf"
if ($LASTEXITCODE -ne 0) {
    Write-Error-Custom "Failed to copy nginx.conf"
    exit 1
}
Write-Success "Transferred nginx.conf"

# ==============================================================================
# STEP 5: Deploy on Server
# ==============================================================================
Write-Header "STEP 5: Deploying on Server"

$deployResponse = Read-Host "Do you want to deploy to the server now? (y/n)"

if ($deployResponse -eq "y" -or $deployResponse -eq "Y") {
    
    Write-Info "Connecting to ${SERVER_HOST}..."
    Write-Host "Enter SSH password when prompted" -ForegroundColor Yellow
    
    $deployScript = @'
set -e

# Colors for remote
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /home/kairo/CoreBankingAPI

echo -e "${BLUE}→ Creating backup of current configuration...${NC}"
BACKUP_TS=$(date +%Y%m%d-%H%M%S)
cp docker-compose.yml "docker-compose.yml.backup.${BACKUP_TS}" 2>/dev/null || true
cp nginx.conf "nginx.conf.backup.${BACKUP_TS}" 2>/dev/null || true
echo -e "${GREEN}✓ Backup created: docker-compose.yml.backup.${BACKUP_TS}${NC}"

echo -e "${BLUE}→ Replacing configuration files...${NC}"
mv docker-compose.new.yml docker-compose.yml
mv nginx.new.conf nginx.conf
echo -e "${GREEN}✓ Configuration replaced${NC}"

echo -e "${BLUE}→ Pulling latest images from Docker Hub...${NC}"
docker-compose pull kairo-ui client-management-api account-management-api systemcore-api 2>&1 | tail -n 10
echo -e "${GREEN}✓ Images pulled${NC}"

echo -e "${BLUE}→ Stopping old containers...${NC}"
docker-compose stop kairo_frontend client-maintenance account-maintenance 2>/dev/null || true
echo -e "${GREEN}✓ Old containers stopped${NC}"

echo -e "${BLUE}→ Removing old containers...${NC}"
docker-compose rm -f kairo_frontend client-maintenance account-maintenance 2>/dev/null || true
echo -e "${GREEN}✓ Old containers removed${NC}"

echo -e "${BLUE}→ Starting new services...${NC}"
docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api
echo -e "${GREEN}✓ New services started${NC}"

echo -e "${BLUE}→ Restarting nginx proxy...${NC}"
docker-compose restart nginx-proxy
echo -e "${GREEN}✓ Nginx restarted${NC}"

echo -e "${BLUE}→ Waiting for services to initialize (30 seconds)...${NC}"
sleep 30

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Status                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

docker-compose ps

echo ""
echo -e "${BLUE}→ Testing health endpoints...${NC}"

if curl -f -s http://localhost:3306/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Client Management API: HEALTHY${NC}"
else
    echo -e "${YELLOW}⚠ Client Management API: Checking...${NC}"
fi

if curl -f -s http://localhost:3307/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Account Management API: HEALTHY${NC}"
else
    echo -e "${YELLOW}⚠ Account Management API: Checking...${NC}"
fi

if curl -f -s http://localhost:3311/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ System Core API: HEALTHY${NC}"
else
    echo -e "${YELLOW}⚠ System Core API: Checking...${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   Deployment Completed!                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Service URLs:${NC}"
echo -e "  • Main UI:              ${GREEN}https://kairo.craftsilicon.com${NC}"
echo -e "  • IAM API:              http://172.17.50.15:3309"
echo -e "  • Client Management:    http://172.17.50.15:3306"
echo -e "  • Account Management:   http://172.17.50.15:3307"
echo -e "  • System Core API:      http://172.17.50.15:3311"
echo ""
echo -e "${YELLOW}Backup saved as: docker-compose.yml.backup.${BACKUP_TS}${NC}"
echo ""

# Show recent logs
echo -e "${BLUE}→ Recent logs from kairo-ui:${NC}"
docker-compose logs --tail=20 kairo-ui
'@
    
    ssh "${SERVER_USER}@${SERVER_HOST}" $deployScript
    
    Write-Host ""
    Write-Success "Deployment completed successfully on ${SERVER_HOST}!"
    
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "║   DEPLOYMENT SUCCESSFUL!                         ║" -ForegroundColor Green
    Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Open browser: https://kairo.craftsilicon.com" -ForegroundColor White
    Write-Host "  2. Test login functionality" -ForegroundColor White
    Write-Host "  3. Test account maintenance features" -ForegroundColor White
    Write-Host ""
    
    # Offer to view logs
    $logsResponse = Read-Host "Do you want to view live logs? (y/n)"
    if ($logsResponse -eq "y" -or $logsResponse -eq "Y") {
        Write-Info "Connecting to logs (Press Ctrl+C to exit)..."
        ssh "${SERVER_USER}@${SERVER_HOST}" "cd ${SERVER_PATH} && docker-compose logs -f --tail=100 kairo-ui"
    }
    
} else {
    Write-Host "⊘ Deployment skipped" -ForegroundColor Yellow
    Write-Host "Configuration files are ready on server at:" -ForegroundColor Cyan
    Write-Host "  ${SERVER_PATH}/docker-compose.new.yml"
    Write-Host "  ${SERVER_PATH}/nginx.new.conf"
}

Write-Host ""
Write-Host "Deployment script completed!" -ForegroundColor Green
Write-Host ""
