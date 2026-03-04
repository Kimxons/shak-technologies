#!/bin/bash
# Final Deployment - .NET 8.0 Fixed Images
# Run on server as: bash final-deploy.sh

cd /home/kairo/CoreBankingAPI

echo "=================================================="
echo "  Pulling Fixed .NET 8.0 Images from Docker Hub"
echo "=================================================="

sudo docker-compose pull systemcore-api account-management-api client-management-api

echo ""
echo "=================================================="
echo "  Restarting Services with Fixed Images"
echo "=================================================="

# Stop all services
sudo docker-compose stop systemcore-api account-management-api client-management-api

# Remove old containers
sudo docker-compose rm -f systemcore-api account-management-api client-management-api

# Start with new images
sudo docker-compose up -d systemcore-api account-management-api client-management-api kairo-ui

# Restart nginx
sudo docker-compose restart nginx-proxy

echo ""
echo "Waiting 45 seconds for services to initialize..."
sleep 45

echo ""
echo "=================================================="
echo "  Deployment Status"
echo "=================================================="
sudo docker-compose ps

echo ""
echo "=================================================="
echo "  Testing Health Endpoints"
echo "=================================================="
curl -s http://localhost:3306/health && echo "✓ Client Management API: HEALTHY" || echo "✗ Client Management API: DOWN"
curl -s http://localhost:3307/health && echo "✓ Account Management API: HEALTHY" || echo "✗ Account Management API: DOWN"
curl -s http://localhost:3311/health && echo "✓ System Core API: HEALTHY" || echo "✗ System Core API: DOWN"

echo ""
echo "=================================================="
echo "  Recent Logs (Check for Errors)"
echo "=================================================="
echo ""
echo "--- SystemCore API ---"
sudo docker-compose logs --tail=20 systemcore-api

echo ""
echo "--- Account Management API ---"
sudo docker-compose logs --tail=20 account-management-api

echo ""
echo "--- Client Management API ---"
sudo docker-compose logs --tail=20 client-management-api

echo ""
echo "=================================================="
echo "  Deployment Complete!"
echo "=================================================="
echo "Access URL: https://kairo.craftsilicon.com"
echo ""
