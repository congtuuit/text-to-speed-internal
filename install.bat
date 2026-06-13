@echo off
chcp 65001 >nul

echo Checking environment...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Python not found! Attempting automatic installation via winget...
    winget install --id Python.Python.3.11 -e --accept-package-agreements --accept-source-agreements
    echo [IMPORTANT] Python installation complete. Please close this window and run install.bat again!
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] Node.js not found! Attempting automatic installation via winget...
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    echo [IMPORTANT] Node.js installation complete. Please close this window and run install.bat again!
    pause
    exit /b 1
)

where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [WARNING] FFmpeg not found! Attempting automatic installation via winget...
    winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
    echo [IMPORTANT] FFmpeg installation complete. Please close this window and run install.bat again!
    pause
    exit /b 1
)

echo ==============================================
echo INSTALLING TEXT-TO-SPEECH (BACKEND)
echo ==============================================
cd backend
if not exist "venv" (
    echo Creating Python virtual environment venv...
    python -m venv venv
)
echo Installing Python libraries...
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo.
echo ==============================================
echo INSTALLING TEXT-TO-SPEECH (FRONTEND)
echo ==============================================
cd frontend
if not exist ".env" (
    echo Creating default .env file...
    echo VITE_API_BASE_URL=http://localhost:8000> .env
)
echo Installing Node.js libraries...
call npm install
cd ..

echo.
echo ==============================================
echo INSTALLATION COMPLETE!
echo Please read SETUP_GUIDE.md to learn how to run the application.
echo ==============================================
pause
