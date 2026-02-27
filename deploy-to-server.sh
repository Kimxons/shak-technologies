#!/bin/bash

# ==============================================================================
# KAIRO Quick Deploy - Manual Steps Helper
# ==============================================================================

SERVER="kairo@172.17.50.15"
SERVER_PATH="/home/kairo/CoreBankingAPI"

echo "================================================"
echo "  KAIRO Docker Deployment Helper"
echo "================================================"
echo ""
echo "This script will guide you through the deployment process."
echo ""

# Step 1: Copy files
echo "Step 1: Transferring configuration files to server..."
echo "→ Copying docker-compose.yml..."
scp docker-compose.final.yml ${SERVER}:${SERVER_PATH}/docker-compose.new.yml

echo "→ Copying nginx.conf..."
scp nginx.new.conf ${SERVER}:${SERVER_PATH}/nginx.new.conf

echo "✓ Files transferred!"
echo ""

# Step 2: Provide manual commands
echo "================================================"
echo "Next steps - Run these commands on the server:"
echo "================================================"
echo ""
echo "# SSH into the server:"
echo "ssh ${SERVER}"
echo ""
echo "# Navigate to deployment directory:"
echo "cd ${SERVER_PATH}"
echo ""
echo "# Backup current configuration:"
echo "cp docker-compose.yml docker-compose.yml.backup.\$(date +%Y%m%d-%H%M%S)"
echo "cp nginx.conf nginx.conf.backup.\$(date +%Y%m%d-%H%M%S)"
echo ""
echo "# Replace with new configuration:"
echo "mv docker-compose.new.yml docker-compose.yml"
echo "mv nginx.new.conf nginx.conf"
echo ""
echo "# Pull new images from Docker Hub:"
echo "docker-compose pull kairo-ui client-management-api account-management-api systemcore-api"
echo ""
echo "# Stop old containers:"
echo "docker-compose stop kairo_frontend client-maintenance account-maintenance"
echo ""
echo "# Remove old containers:"
echo "docker-compose rm -f kairo_frontend client-maintenance account-maintenance"
echo ""
echo "# Start new services:"
echo "docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api"
echo ""
echo "# Restart nginx:"
echo "docker-compose restart nginx-proxy"
echo ""
echo "# Check status:"
echo "docker-compose ps"
echo ""
echo "# View logs:"
echo "docker-compose logs -f --tail=100 kairo-ui"
echo ""
echo "================================================"
echo ""

# Offer to execute automatically
read -p "Do you want to execute these commands automatically via SSH? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "Executing deployment on server..."
    ssh ${SERVER} bash << 'ENDSSH'
        set -e
        cd /home/kairo/CoreBankingAPI
        
        echo "→ Creating backups..."
        cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d-%H%M%S)
        cp nginx.conf nginx.conf.backup.$(date +%Y%m%d-%H%M%S)
        
        echo "→ Replacing configuration files..."
        mv docker-compose.new.yml docker-compose.yml
        mv nginx.new.conf nginx.conf
        
        echo "→ Pulling latest images..."
        docker-compose pull kairo-ui client-management-api account-management-api systemcore-api
        
        echo "→ Stopping old containers..."
        docker-compose stop kairo_frontend client-maintenance account-maintenance || true
        
        echo "→ Removing old containers..."
        docker-compose rm -f kairo_frontend client-maintenance account-maintenance || true
        
        echo "→ Starting new services..."
        docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api
        
        echo "→ Restarting nginx..."
        docker-compose restart nginx-proxy
        
        echo "→ Waiting for services to be healthy..."
        sleep 10
        
        echo "→ Service status:"
        docker-compose ps
        
        echo ""
        echo "✓ Deployment completed!"
        echo ""
        echo "Service URLs:"
        echo "  • Main UI:              https://kairo.craftsilicon.com"
        echo "  • Client Management:    http://localhost:3306/health"
        echo "  • Account Management:   http://localhost:3307/health"
        echo "  • System Core API:      http://localhost:3311/health"
ENDSSH
    
    echo ""
    echo "✓ Deployment completed successfully!"
fi
