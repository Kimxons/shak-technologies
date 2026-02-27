@echo off
color 0C
cls

echo.
echo ======================================================
echo   PORT CONFLICT RESOLVER
echo ======================================================
echo.
echo  Port 8888 is already in use.
echo  This tool will help you fix it.
echo.
pause

powershell -ExecutionPolicy Bypass -File "fix-port-conflict.ps1"

pause
