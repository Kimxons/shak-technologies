# ==============================================================================
# KAIRO DOCKER DEPLOYMENT - Quick Reference Commands
# ==============================================================================

## PHASE 1: LOCAL BUILD (Run from your development machine)
## ==============================================================================

### 1. Build all Docker images locally
docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest .
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest .
docker build -f ClientManagement/Dockerfile -t jipheens/client-management-api:latest .
docker build -f SystemCoreApi/Dockerfile -t jipheens/systemcore-api:latest .

### 2. (Optional) Test images locally
docker run -d -p 8080:80 --name test-kairo-ui jipheens/kairo-ui:latest
docker logs test-kairo-ui
docker stop test-kairo-ui && docker rm test-kairo-ui

### 3. Login to Docker Hub
docker login

### 4. Push images to Docker Hub
docker push jipheens/kairo-ui:latest
docker push jipheens/account-management-api:latest
docker push jipheens/client-management-api:latest
docker push jipheens/systemcore-api:latest


## PHASE 2: SERVER DEPLOYMENT (Run from your development machine)
## ==============================================================================

### 1. Copy configuration files to server
scp docker-compose.new.yml kairo@172.17.50.15:/home/kairo/CoreBankingAPI/docker-compose.yml
scp nginx.new.conf kairo@172.17.50.15:/home/kairo/CoreBankingAPI/nginx.conf

### 2. SSH into server and deploy
ssh kairo@172.17.50.15

### 3. Navigate to deployment directory (on server)
cd /home/kairo/CoreBankingAPI

### 4. Pull latest images (on server)
docker-compose pull kairo-ui client-management-api account-management-api systemcore-api

### 5. Stop and remove old containers (on server)
docker-compose stop kairo_frontend client-maintenance account-maintenance
docker-compose rm -f kairo_frontend client-maintenance account-maintenance

### 6. Start new services (on server)
docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api

### 7. Restart nginx to pick up new upstream servers (on server)
docker-compose restart nginx-proxy

### 8. Verify deployment (on server)
docker-compose ps
docker-compose logs -f --tail=50 kairo-ui


## PHASE 3: VERIFICATION & TROUBLESHOOTING
## ==============================================================================

### Check service health
curl http://localhost:3306/health  # Client Management
curl http://localhost:3307/health  # Account Management
curl http://localhost:3311/health  # System Core API

### View logs for specific service
docker-compose logs -f kairo-ui
docker-compose logs -f client-management-api
docker-compose logs -f account-management-api
docker-compose logs -f systemcore-api

### Check all services status
docker-compose ps

### Restart a specific service
docker-compose restart kairo-ui

### View nginx access logs
docker exec nginx-proxy tail -f /var/log/nginx/access.log

### Test API endpoints from server
curl -X POST http://localhost:3306/api/clients/health
curl -X POST http://localhost:3307/api/accounts/health
curl -X POST http://localhost:3311/api/systemcore/health

### Check Docker network
docker network inspect corebankingapi_app-network


## PHASE 4: ROLLBACK (If needed)
## ==============================================================================

### Rollback to previous version (restore old containers)
docker-compose stop kairo-ui client-management-api account-management-api systemcore-api
docker-compose up -d kairo_frontend client-maintenance account-maintenance


## PHASE 5: CLEANUP
## ==============================================================================

### Remove unused images
docker image prune -a

### Remove stopped containers
docker container prune

### Remove unused volumes
docker volume prune


## USEFUL COMMANDS
## ==============================================================================

### Enter a running container
docker exec -it kairo-ui bash
docker exec -it account-management-api bash

### Copy files from container
docker cp kairo-ui:/app/logs/kairo-ui-20250101.txt ./local-logs/

### Check container resource usage
docker stats

### View all running containers
docker ps

### View all containers (including stopped)
docker ps -a

### Check Docker disk usage
docker system df
