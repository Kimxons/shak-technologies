@echo off
REM ==============================================================================
REM KAIRO DEPLOYMENT - ONE COMMAND (Windows)
REM ==============================================================================

echo.
echo ========================================================
echo   KAIRO Docker Deployment
echo   Server: 172.17.50.15
echo ========================================================
echo.

set SERVER=kairo@172.17.50.15
set SERVER_PATH=/home/kairo/CoreBankingAPI

echo Step 1: Building Docker images...
echo.

docker build -f kairo-ui/Dockerfile -t jipheens/kairo-ui:latest . || goto :error
docker build -f AccountManagement/Dockerfile -t jipheens/account-management-api:latest . || goto :error
docker build -f ClientManagement/Dockerfile -t jipheens/client-management-api:latest . || goto :error
docker build -f SystemCoreApi/Dockerfile -t jipheens/systemcore-api:latest . || goto :error

echo.
echo Step 2: Pushing to Docker Hub...
echo.

docker login || goto :error
docker push jipheens/kairo-ui:latest || goto :error
docker push jipheens/account-management-api:latest || goto :error
docker push jipheens/client-management-api:latest || goto :error
docker push jipheens/systemcore-api:latest || goto :error

echo.
echo Step 3: Transferring configuration files...
echo.

scp docker-compose.final.yml %SERVER%:%SERVER_PATH%/docker-compose.new.yml || goto :error
scp nginx.new.conf %SERVER%:%SERVER_PATH%/nginx.new.conf || goto :error

echo.
echo Step 4: Deploying on server...
echo.
echo Please enter server password when prompted.
echo.

ssh %SERVER% "cd %SERVER_PATH% && cp docker-compose.yml docker-compose.yml.backup.$(date +%%Y%%m%%d-%%H%%M%%S) && mv docker-compose.new.yml docker-compose.yml && mv nginx.new.conf nginx.conf && docker-compose pull kairo-ui client-management-api account-management-api systemcore-api && docker-compose stop kairo_frontend client-maintenance account-maintenance && docker-compose rm -f kairo_frontend client-maintenance account-maintenance && docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api && docker-compose restart nginx-proxy && docker-compose ps"

echo.
echo ========================================================
echo   Deployment Completed Successfully!
echo ========================================================
echo.
echo Service URLs:
echo   • Main UI:              https://kairo.craftsilicon.com
echo   • Client Management:    http://172.17.50.15:3306
echo   • Account Management:   http://172.17.50.15:3307
echo   • System Core API:      http://172.17.50.15:3311
echo.

goto :success

:error
echo.
echo ========================================================
echo   Deployment FAILED!
echo ========================================================
echo.
pause
exit /b 1

:success
pause
