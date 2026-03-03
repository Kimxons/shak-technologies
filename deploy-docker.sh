#!/bin/bash

# ==============================================================================
# KAIRO Docker Build and Deployment Script
# ==============================================================================
# This script builds Docker images for all KAIRO services and deploys them
# to the production server at 172.17.50.15
# ==============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DOCKER_REGISTRY="jipheens"
SERVER_USER="kairo"
SERVER_HOST="172.17.50.15"
SERVER_PATH="/home/kairo/CoreBankingAPI"
VERSION_TAG=$(date +%Y%m%d-%H%M%S)

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  KAIRO Docker Build & Deployment Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# ==============================================================================
# Function: Build Docker Image
# ==============================================================================
build_image() {
    local service_name=$1
    local dockerfile_path=$2
    local image_name="${DOCKER_REGISTRY}/${service_name}:latest"
    local versioned_image="${DOCKER_REGISTRY}/${service_name}:${VERSION_TAG}"

    echo -e "${YELLOW}→ Building ${service_name}...${NC}"
    
    docker build \
        -f "${dockerfile_path}" \
        -t "${image_name}" \
        -t "${versioned_image}" \
        . || { echo -e "${RED}✗ Failed to build ${service_name}${NC}"; exit 1; }
    
    echo -e "${GREEN}✓ Built ${service_name} successfully${NC}"
    echo ""
}

# ==============================================================================
# Function: Push Docker Image
# ==============================================================================
push_image() {
    local service_name=$1
    local image_name="${DOCKER_REGISTRY}/${service_name}:latest"
    local versioned_image="${DOCKER_REGISTRY}/${service_name}:${VERSION_TAG}"

    echo -e "${YELLOW}→ Pushing ${service_name} to Docker Hub...${NC}"
    
    docker push "${image_name}" || { echo -e "${RED}✗ Failed to push ${service_name}${NC}"; exit 1; }
    docker push "${versioned_image}" || { echo -e "${RED}✗ Failed to push ${service_name} versioned${NC}"; exit 1; }
    
    echo -e "${GREEN}✓ Pushed ${service_name} successfully${NC}"
    echo ""
}

# ==============================================================================
# Step 1: Build All Images
# ==============================================================================
echo -e "${BLUE}Step 1: Building Docker Images${NC}"
echo ""

build_image "kairo-ui" "kairo-ui/Dockerfile"
build_image "account-management-api" "AccountManagement/Dockerfile"
build_image "client-management-api" "ClientManagement/Dockerfile"
build_image "systemcore-api" "SystemCoreApi/Dockerfile"

echo -e "${GREEN}✓ All images built successfully!${NC}"
echo ""

# ==============================================================================
# Step 2: Push Images to Docker Hub (Optional)
# ==============================================================================
read -p "Do you want to push images to Docker Hub? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${BLUE}Step 2: Pushing Images to Docker Hub${NC}"
    echo ""
    
    # Login to Docker Hub
    echo -e "${YELLOW}→ Logging in to Docker Hub...${NC}"
    docker login || { echo -e "${RED}✗ Docker login failed${NC}"; exit 1; }
    
    push_image "kairo-ui"
    push_image "account-management-api"
    push_image "client-management-api"
    push_image "systemcore-api"
    
    echo -e "${GREEN}✓ All images pushed successfully!${NC}"
    echo ""
else
    echo -e "${YELLOW}⊘ Skipping Docker Hub push${NC}"
    echo ""
fi

# ==============================================================================
# Step 3: Transfer Configuration Files to Server
# ==============================================================================
echo -e "${BLUE}Step 3: Transferring Configuration Files to Server${NC}"
echo ""

echo -e "${YELLOW}→ Copying docker-compose.yml...${NC}"
scp docker-compose.new.yml ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/docker-compose.yml

echo -e "${YELLOW}→ Copying nginx.conf...${NC}"
scp nginx.new.conf ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/nginx.conf

echo -e "${GREEN}✓ Configuration files transferred${NC}"
echo ""

# ==============================================================================
# Step 4: Deploy to Server
# ==============================================================================
read -p "Do you want to deploy to the server now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo -e "${BLUE}Step 4: Deploying to Server${NC}"
    echo ""
    
    ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
        set -e
        cd /home/kairo/CoreBankingAPI
        
        echo "→ Pulling latest images..."
        docker-compose pull kairo-ui client-management-api account-management-api systemcore-api
        
        echo "→ Stopping old containers..."
        docker-compose stop kairo_frontend client-maintenance account-maintenance || true
        
        echo "→ Removing old containers..."
        docker-compose rm -f kairo_frontend client-maintenance account-maintenance || true
        
        echo "→ Starting new services..."
        docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api
        
        echo "→ Restarting nginx proxy..."
        docker-compose restart nginx-proxy
        
        echo "→ Checking service status..."
        docker-compose ps
        
        echo ""
        echo "✓ Deployment completed!"
ENDSSH
    
    echo -e "${GREEN}✓ Successfully deployed to ${SERVER_HOST}!${NC}"
    echo ""
    
    # Show logs
    read -p "Do you want to view logs? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]
    then
        ssh ${SERVER_USER}@${SERVER_HOST} "cd ${SERVER_PATH} && docker-compose logs -f --tail=50 kairo-ui"
    fi
else
    echo -e "${YELLOW}⊘ Skipping deployment${NC}"
fi

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Deployment Process Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "Service URLs:"
echo -e "  • Main UI:              https://kairo.craftsilicon.com"
echo -e "  • IAM API:              http://172.17.50.15:3309"
echo -e "  • Client Management:    http://172.17.50.15:3306"
echo -e "  • Account Management:   http://172.17.50.15:3307"
echo -e "  • System Core API:      http://172.17.50.15:3311"
echo -e "  • IAM Web Client:       http://172.17.50.15:3310"
echo ""
