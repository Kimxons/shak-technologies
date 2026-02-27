@echo off
color 0B
cls

echo.
echo ======================================================
echo   STARTING KAIRO BUILD DASHBOARD
echo ======================================================
echo.
echo  This will:
echo    1. Start a local web server on http://localhost:8888
echo    2. Open the Build Dashboard in your browser
echo    3. Allow you to select services and build them
echo.
echo  Press Ctrl+C in the PowerShell window to stop
echo.
pause

powershell -ExecutionPolicy Bypass -File "start-build-dashboard.ps1"

pause
