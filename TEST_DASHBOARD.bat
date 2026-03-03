@echo off
color 0A
cls

echo.
echo ======================================================
echo   TESTING BUILD DASHBOARD
echo ======================================================
echo.
echo  Running tests to verify everything is ready...
echo.
pause

powershell -ExecutionPolicy Bypass -File "test-dashboard.ps1"

echo.
echo ======================================================
echo.
pause
