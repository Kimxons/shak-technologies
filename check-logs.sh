#!/bin/bash

# Diagnostic Script - Check logs for failing containers
# Run on server: kairo@172.17.50.15

cd /home/kairo/CoreBankingAPI

echo "=========================================="
echo "Checking systemcore-api logs..."
echo "=========================================="
sudo docker-compose logs --tail=100 systemcore-api

echo ""
echo "=========================================="
echo "Checking account-management-api logs..."
echo "=========================================="
sudo docker-compose logs --tail=100 account-management-api

echo ""
echo "=========================================="
echo "Checking client-management-api logs..."
echo "=========================================="
sudo docker-compose logs --tail=100 client-management-api

echo ""
echo "=========================================="
echo "Checking kairo-ui logs..."
echo "=========================================="
sudo docker-compose logs --tail=50 kairo-ui

echo ""
echo "=========================================="
echo "Checking if appsettings files exist in containers..."
echo "=========================================="
sudo docker run --rm jipheens/systemcore-api:latest ls -la /app/appsettings*.json
sudo docker run --rm jipheens/account-management-api:latest ls -la /app/appsettings*.json
sudo docker run --rm jipheens/client-management-api:latest ls -la /app/appsettings*.json
