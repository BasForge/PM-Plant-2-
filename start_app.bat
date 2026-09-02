@echo off
title Thai Food Maintenance - Python LAN Server
color 0A
echo =======================================================================
echo     Thai Food Maintenance - Python Startup Tool (Windows)
echo =======================================================================
echo Checking system requirements...

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is NOT installed or not added to PATH on this computer!
    echo To run this application, you need Python 3 installed.
    echo Opening https://www.python.org/downloads in your browser...
    start "" "https://www.python.org/downloads"
    echo.
    echo Once installed, please re-run this script.
    pause
    exit /b
)

echo Python is detected! Starting Centralized LAN Server...
echo.
echo =======================================================================
echo [SUCCESS] Starting local offline server...
echo Your application will open automatically at http://localhost:8000
echo (To close the application, simply close this command window)
echo =======================================================================
echo.

:: Open default browser to localhost:8000 in 2 seconds
timeout /t 2 /nobreak >nul
start "" "http://localhost:8000"

:: Start the Python LAN server
python lan_server.py
pause
