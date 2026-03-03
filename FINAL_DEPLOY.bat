@echo off
color 0A
echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║   KAIRO FINAL DEPLOYMENT - .NET 8.0 FIXED       ║
echo ║   Target: 172.17.50.15                           ║
echo ╚═══════════════════════════════════════════════════╝
echo.
echo This will deploy the CORRECTED .NET 8.0 images.
echo.
echo You'll be prompted for:
echo   - SSH password
echo   - Sudo password (usually same)
echo.
pause
echo.
echo Connecting to server and executing deployment...
echo.

ssh kairo@172.17.50.15 "bash /home/kairo/CoreBankingAPI/final-deploy.sh"

echo.
echo ╔═══════════════════════════════════════════════════╗
echo ║   DEPLOYMENT COMPLETE!                           ║
echo ╚═══════════════════════════════════════════════════╝
echo.
echo Next Steps:
echo   1. Open: https://kairo.craftsilicon.com
echo   2. Test login and account management features
echo.
pause
