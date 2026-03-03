@echo off
color 0E
cls

echo.
echo ======================================================
echo   BUILDING ALL SERVICES
echo ======================================================
echo.
echo  This will build:
echo    1. kairo-ui (Frontend)
echo    2. Account Management API
echo    3. Client Management API
echo    4. SystemCore API
echo.
echo  This may take 15-20 minutes.
echo.
pause

powershell -ExecutionPolicy Bypass -File "simple-build.ps1" -Service all

pause
