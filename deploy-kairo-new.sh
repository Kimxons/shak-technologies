#!/bin/bash
# Modern Kairo Deployment Script
# For NEW architecture with .NET 9 kairo-ui and .NET 8 APIs

set -euo pipefail

DIR="/home/kairo/CoreBankingAPI"
COMPOSE_FILE="$DIR/docker-compose.yml"

echo "=========================================="
echo "  KAIRO DEPLOYMENT - NEW ARCHITECTURE"
echo "=========================================="
echo ""
echo "Working directory: $DIR"
echo ""

# Login to Docker Hub
echo "[1/6] Logging into Docker Hub..."
echo "SuPassCode@60" | docker login -u jipheens --password-stdin

cd "$DIR" || { echo "Failed to change directory to $DIR"; exit 1; }

# Verify docker-compose exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: docker-compose.yml not found at $COMPOSE_FILE"
    exit 1
fi

echo ""
echo "[2/6] Pulling latest images..."
docker-compose pull

echo ""
echo "[3/6] Cleaning up old images..."
docker image prune -f

echo ""
echo "[4/6] Stopping old containers..."
docker-compose down --remove-orphans

echo ""
echo "[5/6] Starting all services..."
docker-compose up -d

echo ""
echo "[6/6] Waiting for services to initialize..."
sleep 30

echo ""
echo "=========================================="
echo "  DEPLOYMENT STATUS"
echo "=========================================="
echo ""

# Check each service
echo "Service Status:"
docker-compose ps

echo ""
echo "Health Checks:"
echo ""

# Test health endpoints
echo -n "  IAM API (3309):              "
curl -s http://localhost:3309/health > /dev/null && echo "✓ OK" || echo "✗ FAIL"

echo -n "  Client Management (3306):    "
curl -s http://localhost:3306/health > /dev/null && echo "✓ OK" || echo "✗ FAIL"

echo -n "  Account Management (3307):   "
curl -s http://localhost:3307/health > /dev/null && echo "✓ OK" || echo "✗ FAIL"

echo -n "  SystemCore API (3311):       "
curl -s http://localhost:3311/health > /dev/null && echo "✓ OK" || echo "✗ FAIL"

echo -n "  Main Application (80):       "
curl -s -I http://localhost/ > /dev/null && echo "✓ OK" || echo "✗ FAIL"

echo ""
echo "=========================================="
echo "  DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Services available at:"
echo "  Main Application:     https://kairo.craftsilicon.com"
echo "  IAM API:              http://172.17.50.15:3309"
echo "  Client Management:    http://172.17.50.15:3306"
echo "  Account Management:   http://172.17.50.15:3307"
echo "  SystemCore API:       http://172.17.50.15:3311"
echo ""
echo "Management commands:"
echo "  View logs:            sudo docker-compose logs -f <service-name>"
echo "  Restart service:      sudo docker-compose restart <service-name>"
echo "  Stop all:             sudo docker-compose down"
echo "  View status:          sudo docker-compose ps"
echo ""
echo "Service names:"
echo "  - kairo-ui"
echo "  - iam-api"
echo "  - client-management-api"
echo "  - account-management-api"
echo "  - systemcore-api"
echo "  - nginx-proxy"
echo ""
