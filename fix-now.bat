@echo off
echo ========================================================
echo   KAIRO DEPLOYMENT FIX
echo   Connecting to 172.17.50.15
echo ========================================================
echo.
echo This will:
echo   1. Stop old containers blocking ports 3306/3307
echo   2. Remove old containers
echo   3. Start new .NET 9 services
echo   4. Restart nginx
echo.
echo You will be prompted for:
echo   - SSH password
echo   - Sudo password (usually same as SSH)
echo.
pause
echo.

ssh kairo@172.17.50.15 "cd /home/kairo/CoreBankingAPI && sudo docker stop core_banking_account core_banking_client kairo-frontend && sudo docker rm -f core_banking_account core_banking_client kairo-frontend && sudo docker-compose up -d kairo-ui client-management-api account-management-api systemcore-api && sudo docker-compose restart nginx-proxy && echo 'Waiting 30 seconds...' && sleep 30 && sudo docker-compose ps && echo '' && echo 'Testing health endpoints:' && curl -s http://localhost:3306/health && curl -s http://localhost:3307/health && curl -s http://localhost:3311/health"

echo.
echo ========================================================
echo   Deployment Fix Completed!
echo ========================================================
echo.
echo Next: Open https://kairo.craftsilicon.com to test
echo.
pause
