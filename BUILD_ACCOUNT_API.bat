@echo off
color 0D
cls

echo.
echo ======================================================
echo   BUILDING ACCOUNT MANAGEMENT API
echo ======================================================
echo.
echo  This will:
echo    1. Build the Account Management API Docker image
echo    2. Push it to Docker Hub
echo    3. Show deployment instructions
echo.
pause

powershell -ExecutionPolicy Bypass -File "simple-build.ps1" -Service account-management-api

pause
