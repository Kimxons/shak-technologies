#!/bin/bash
# Quick Deploy Script for Server
# Usage: bash quick-deploy.sh <service-name>
# Example: bash quick-deploy.sh kairo-ui

if [ -z "$1" ]; then
    echo "Usage: bash quick-deploy.sh <service-name>"
    echo ""
    echo "Available services:"
    echo "  - kairo-ui"
    echo "  - client-management-api"
    echo "  - account-management-api"
    echo "  - systemcore-api"
    echo "  - iam-api"
    echo ""
    exit 1
fi

SERVICE=$1
cd /home/kairo/CoreBankingAPI

echo "=================================================="
echo "  Quick Deploy: $SERVICE"
echo "=================================================="
echo ""

echo "[1/5] Pulling latest image from Docker Hub..."
sudo docker-compose pull $SERVICE

echo ""
echo "[2/5] Stopping current container..."
sudo docker-compose stop $SERVICE

echo ""
echo "[3/5] Removing old container..."
sudo docker-compose rm -f $SERVICE

echo ""
echo "[4/5] Starting new container..."
sudo docker-compose up -d $SERVICE

echo ""
echo "[5/5] Waiting 20 seconds for initialization..."
sleep 20

echo ""
echo "=================================================="
echo "  Deployment Status"
echo "=================================================="
sudo docker-compose ps | grep $SERVICE

echo ""
echo "=================================================="
echo "  Recent Logs"
echo "=================================================="
sudo docker-compose logs --tail=30 $SERVICE

echo ""
echo "✅ Deployment complete!"
echo ""
