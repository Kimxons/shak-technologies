@echo off
color 0A
cls

echo.
echo ======================================================
echo   BUILDING CLIENT MANAGEMENT API
echo ======================================================
echo.
echo  This will:
echo    1. Build the Client Management API Docker image
echo    2. Push it to Docker Hub
echo    3. Show deployment instructions
echo.
pause

powershell -ExecutionPolicy Bypass -File "simple-build.ps1" -Service client-management-api

pause
