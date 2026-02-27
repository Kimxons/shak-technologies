#!/bin/bash

# ==============================================================================
# KAIRO COMPLETE DEPLOYMENT SCRIPT
# ==============================================================================
# This script handles the complete deployment process for KAIRO services
# Server: kairo@172.17.50.15
# Path: /home/kairo/CoreBankingAPI
# ==============================================================================

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Configuration
DOCKER_REGISTRY="jipheens"
SERVER_USER="kairo"
SERVER_HOST="172.17.50.15"
SERVER_PATH="/home/kairo/CoreBankingAPI"
VERSION_TAG=$(date +%Y%m%d-%H%M%S)

# Services to deploy
SERVICES=("kairo-ui" "account-management-api" "client-management-api" "systemcore-api")
DOCKERFILES=("kairo-ui/Dockerfile" "AccountManagement/Dockerfile" "ClientManagement/Dockerfile" "SystemCoreApi/Dockerfile")

clear
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════╗"
echo "║   KAIRO Docker Deployment Script                  ║"
echo "║   Version: 1.0                                     ║"
echo "║   Server: ${SERVER_HOST}                      ║"
echo "╚════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# ==============================================================================
# Function: Print Step Header
# ==============================================================================
print_step() {
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN} $1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════${NC}"
    echo ""
}

# ==============================================================================
# Function: Print Success
# ==============================================================================
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# ==============================================================================
# Function: Print Error
# ==============================================================================
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ==============================================================================
# Function: Print Warning
# ==============================================================================
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# ==============================================================================
# Function: Print Info
# ==============================================================================
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# ==============================================================================
# STEP 1: Pre-flight Checks
# ==============================================================================
print_step "STEP 1: Pre-flight Checks"

echo -e "${YELLOW}→ Checking Docker installation...${NC}"
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed!"
    exit 1
fi
print_success "Docker is installed"

echo -e "${YELLOW}→ Checking Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed!"
    exit 1
fi
print_success "Docker Compose is installed"

echo -e "${YELLOW}→ Checking SSH connectivity to ${SERVER_HOST}...${NC}"
if ! ssh -o BatchMode=yes -o ConnectTimeout=5 ${SERVER_USER}@${SERVER_HOST} exit 2>/dev/null; then
    print_warning "SSH key not configured. You'll need to enter password during deployment."
else
    print_success "SSH connection verified"
fi

echo -e "${YELLOW}→ Checking if Dockerfiles exist...${NC}"
for dockerfile in "${DOCKERFILES[@]}"; do
    if [ ! -f "$dockerfile" ]; then
        print_error "Dockerfile not found: $dockerfile"
        exit 1
    fi
done
print_success "All Dockerfiles found"

# ==============================================================================
# STEP 2: Build Docker Images
# ==============================================================================
print_step "STEP 2: Building Docker Images"

for i in "${!SERVICES[@]}"; do
    service="${SERVICES[$i]}"
    dockerfile="${DOCKERFILES[$i]}"
    
    echo -e "${YELLOW}→ Building ${service}...${NC}"
    
    docker build \
        -f "${dockerfile}" \
        -t "${DOCKER_REGISTRY}/${service}:latest" \
        -t "${DOCKER_REGISTRY}/${service}:${VERSION_TAG}" \
        . 2>&1 | tail -n 5
    
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        print_success "Built ${service}"
    else
        print_error "Failed to build ${service}"
        exit 1
    fi
done

print_success "All images built successfully!"

# Show built images
echo ""
echo -e "${CYAN}Built Images:${NC}"
docker images | grep "${DOCKER_REGISTRY}" | grep -E "$(IFS=\|; echo "${SERVICES[*]}")"

# ==============================================================================
# STEP 3: Push to Docker Hub
# ==============================================================================
print_step "STEP 3: Push Images to Docker Hub"

read -p "$(echo -e ${YELLOW}'Do you want to push images to Docker Hub? (y/n): '${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}→ Logging in to Docker Hub...${NC}"
    docker login || { print_error "Docker login failed"; exit 1; }
    
    for service in "${SERVICES[@]}"; do
        echo -e "${YELLOW}→ Pushing ${service}:latest...${NC}"
        docker push "${DOCKER_REGISTRY}/${service}:latest" 2>&1 | tail -n 3
        
        echo -e "${YELLOW}→ Pushing ${service}:${VERSION_TAG}...${NC}"
        docker push "${DOCKER_REGISTRY}/${service}:${VERSION_TAG}" 2>&1 | tail -n 3
        
        print_success "Pushed ${service}"
    done
    
    print_success "All images pushed to Docker Hub!"
else
    print_warning "Skipping Docker Hub push"
    print_info "Note: Server will need to build images locally or you must push later"
fi

# ==============================================================================
# STEP 4: Transfer Configuration Files
# ==============================================================================
print_step "STEP 4: Transferring Configuration Files"

echo -e "${YELLOW}→ Copying docker-compose.yml to server...${NC}"
scp docker-compose.final.yml ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/docker-compose.new.yml
print_success "Transferred docker-compose.yml"

echo -e "${YELLOW}→ Copying nginx.conf to server...${NC}"
scp nginx.new.conf ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/nginx.new.conf
print_success "Transferred nginx.conf"

# ==============================================================================
# STEP 5: Deploy on Server
# ==============================================================================
print_step "STEP 5: Deploying on Server"

read -p "$(echo -e ${YELLOW}'Do you want to deploy to the server now? (y/n): '${NC})" -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    
    echo -e "${YELLOW}→ Connecting to ${SERVER_HOST}...${NC}"
    
    ssh ${SERVER_USER}@${SERVER_HOST} bash << 'ENDSSH'
        set -e
        
        # Colors for remote execution
        RED='\033[0;31m'
        GREEN='\033[0;32m'
        YELLOW='\033[1;33m'
        BLUE='\033[0;34m'
        NC='\033[0m'
        
        cd /home/kairo/CoreBankingAPI
        
        echo -e "${BLUE}→ Creating backup of current configuration...${NC}"
        BACKUP_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
        cp docker-compose.yml "docker-compose.yml.backup.${BACKUP_TIMESTAMP}"
        cp nginx.conf "nginx.conf.backup.${BACKUP_TIMESTAMP}"
        echo -e "${GREEN}✓ Backup created${NC}"
        
        echo -e "${BLUE}→ Replacing configuration files...${NC}"
        mv docker-compose.new.yml docker-compose.yml
        mv nginx.new.conf nginx.conf
        echo -e "${GREEN}✓ Configuration replaced${NC}"
        
        echo -e "${BLUE}→ Pulling latest images from Docker Hub...${NC}"
        docker-compose pull kairo-ui client-management-api account-management-api systemcore-api
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
        
        echo -e "${BLUE}→ Waiting for services to be healthy (30s)...${NC}"
        sleep 30
        
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   Deployment Status                            ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
        echo ""
        docker-compose ps
        
        echo ""
        echo -e "${BLUE}→ Testing health endpoints...${NC}"
        
        if curl -f -s http://localhost:3306/health > /dev/null; then
            echo -e "${GREEN}✓ Client Management API: HEALTHY${NC}"
        else
            echo -e "${RED}✗ Client Management API: UNHEALTHY${NC}"
        fi
        
        if curl -f -s http://localhost:3307/health > /dev/null; then
            echo -e "${GREEN}✓ Account Management API: HEALTHY${NC}"
        else
            echo -e "${RED}✗ Account Management API: UNHEALTHY${NC}"
        fi
        
        if curl -f -s http://localhost:3311/health > /dev/null; then
            echo -e "${GREEN}✓ System Core API: HEALTHY${NC}"
        else
            echo -e "${RED}✗ System Core API: UNHEALTHY${NC}"
        fi
        
        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║   Deployment Completed Successfully!          ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
        echo ""
        echo -e "${CYAN}Service URLs:${NC}"
        echo -e "  • Main UI:              ${GREEN}https://kairo.craftsilicon.com${NC}"
        echo -e "  • IAM API:              ${BLUE}http://172.17.50.15:3309${NC}"
        echo -e "  • Client Management:    ${BLUE}http://172.17.50.15:3306${NC}"
        echo -e "  • Account Management:   ${BLUE}http://172.17.50.15:3307${NC}"
        echo -e "  • System Core API:      ${BLUE}http://172.17.50.15:3311${NC}"
        echo -e "  • IAM Web Client:       ${BLUE}http://172.17.50.15:3310${NC}"
        echo ""
        echo -e "${YELLOW}Backup files:${NC}"
        echo -e "  • docker-compose.yml.backup.${BACKUP_TIMESTAMP}"
        echo -e "  • nginx.conf.backup.${BACKUP_TIMESTAMP}"
        echo ""
ENDSSH
    
    print_success "Deployment completed on ${SERVER_HOST}!"
    
    # Offer to view logs
    echo ""
    read -p "$(echo -e ${YELLOW}'Do you want to view live logs? (y/n): '${NC})" -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}→ Connecting to logs (Press Ctrl+C to exit)...${NC}"
        ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && docker-compose logs -f --tail=100 kairo-ui"
    fi
    
else
    print_warning "Deployment skipped"
    print_info "Configuration files are ready on the server at:"
    print_info "  • ${SERVER_PATH}/docker-compose.new.yml"
    print_info "  • ${SERVER_PATH}/nginx.new.conf"
    print_info ""
    print_info "To deploy manually, SSH to server and run:"
    print_info "  ssh ${SERVER_USER}@${SERVER_HOST}"
    print_info "  cd ${SERVER_PATH}"
    print_info "  mv docker-compose.new.yml docker-compose.yml"
    print_info "  mv nginx.new.conf nginx.conf"
    print_info "  docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api"
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Script Completed!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
