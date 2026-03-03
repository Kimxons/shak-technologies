#!/bin/bash

# Fix Deployment Script
# Run this on the server: kairo@172.17.50.15

cd /home/kairo/CoreBankingAPI

echo "Stopping and removing old containers that are blocking ports..."

# Stop old containers explicitly
sudo docker stop core_banking_account core_banking_client kairo-frontend 2>/dev/null || true
sudo docker rm -f core_banking_account core_banking_client kairo-frontend 2>/dev/null || true

echo "Old containers removed. Starting new services..."

# Start new services
sudo docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api

echo "Waiting for services to start (30 seconds)..."
sleep 30

echo "Checking service status..."
sudo docker-compose ps

echo -e "\nTesting health endpoints..."
curl -s http://localhost:3306/health && echo "✓ Client Management: HEALTHY" || echo "✗ Client Management: UNHEALTHY"
curl -s http://localhost:3307/health && echo "✓ Account Management: HEALTHY" || echo "✗ Account Management: UNHEALTHY"  
curl -s http://localhost:3311/health && echo "✓ System Core: HEALTHY" || echo "✗ System Core: UNHEALTHY"

echo -e "\nRestarting nginx..."
sudo docker-compose restart nginx-proxy

echo -e "\nChecking logs for errors..."
sudo docker-compose logs --tail=50 systemcore-api
sudo docker-compose logs --tail=50 account-management-api
sudo docker-compose logs --tail=50 client-management-api

echo -e "\nDeployment fix completed!"
