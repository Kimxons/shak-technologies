@echo off
color 0B
cls

echo.
echo ======================================================
echo   BUILDING KAIRO-UI (FRONTEND)
echo ======================================================
echo.
echo  This will:
echo    1. Build the kairo-ui Docker image
echo    2. Push it to Docker Hub
echo    3. Show deployment instructions
echo.
pause

powershell -ExecutionPolicy Bypass -File "simple-build.ps1" -Service kairo-ui

pause
