#!/bin/bash

echo "Checking environment..."
if ! command -v python3 &> /dev/null; then
    echo "[WARNING] Python3 not found! Attempting automatic installation..."
    if command -v apt &> /dev/null; then sudo apt update && sudo apt install -y python3 python3-venv python3-pip
    elif command -v brew &> /dev/null; then brew install python
    else echo "[ERROR] Cannot install automatically. Please install Python 3.9+ manually."; exit 1; fi
fi

if ! command -v npm &> /dev/null; then
    echo "[WARNING] Node.js not found! Attempting automatic installation..."
    if command -v apt &> /dev/null; then sudo apt update && sudo apt install -y nodejs npm
    elif command -v brew &> /dev/null; then brew install node
    else echo "[ERROR] Cannot install automatically. Please install Node.js v18+ manually."; exit 1; fi
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "[WARNING] FFmpeg not found! Attempting automatic installation..."
    if command -v apt &> /dev/null; then sudo apt update && sudo apt install -y ffmpeg
    elif command -v brew &> /dev/null; then brew install ffmpeg
    else echo "[ERROR] Cannot install automatically. Please install FFmpeg manually."; exit 1; fi
fi

echo "=============================================="
echo "INSTALLING TEXT-TO-SPEECH (BACKEND)"
echo "=============================================="
cd backend

if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment venv..."
    python3 -m venv venv
fi

echo "Installing Python libraries..."
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo ""
echo "=============================================="
echo "INSTALLING TEXT-TO-SPEECH (FRONTEND)"
echo "=============================================="
cd frontend
if [ ! -f ".env" ]; then
    echo "Creating default .env file..."
    echo "VITE_API_BASE_URL=http://localhost:8000" > .env
fi
echo "Installing Node.js libraries..."
npm install
cd ..

echo ""
echo "=============================================="
echo "INSTALLATION COMPLETE!"
echo "Please read SETUP_GUIDE.md to learn how to run the application."
echo "=============================================="
