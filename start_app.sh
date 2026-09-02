#!/bin/bash

clear
echo "======================================================================="
echo "    Thai Food Maintenance - Python Startup Tool (macOS/Linux)"
echo "======================================================================="
echo "Checking system requirements..."

# Check if Python is installed
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null
then
    echo "[ERROR] Python is NOT installed on this computer!"
    echo "To run this application, you need Python 3 installed."
    echo "Opening https://www.python.org/downloads in your browser..."
    open "https://www.python.org/downloads" 2>/dev/null || xdg-open "https://www.python.org/downloads" 2>/dev/null
    echo ""
    echo "Once installed, please re-run this script."
    read -p "Press Enter to exit..."
    exit 1
fi

echo "Python is detected! Starting Centralized LAN Server..."
echo ""
echo "======================================================================="
echo "[SUCCESS] Starting local offline server..."
echo "Your application will open automatically at http://localhost:8000"
echo "(To close the application, simply close this terminal window)"
echo "======================================================================="
echo ""

# Open browser after 2 seconds
sleep 2
open "http://localhost:8000" 2>/dev/null || xdg-open "http://localhost:8000" 2>/dev/null

# Start Python LAN server
if command -v python3 &> /dev/null; then
    python3 lan_server.py
else
    python lan_server.py
fi
