@echo off
chcp 65001 >nul

echo Kiểm tra môi trường...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [CẢNH BÁO] Không tìm thấy Python! Đang thử cài đặt tự động qua winget...
    winget install --id Python.Python.3.11 -e --accept-package-agreements --accept-source-agreements
    echo [QUAN TRỌNG] Đã cài đặt xong Python. Vui lòng đóng cửa sổ này và chạy lại file install.bat!
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [CẢNH BÁO] Không tìm thấy Node.js! Đang thử cài đặt tự động qua winget...
    winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
    echo [QUAN TRỌNG] Đã cài đặt xong Node.js. Vui lòng đóng cửa sổ này và chạy lại file install.bat!
    pause
    exit /b 1
)

where ffmpeg >nul 2>nul
if %errorlevel% neq 0 (
    echo [CẢNH BÁO] Không tìm thấy FFmpeg! Đang thử cài đặt tự động qua winget...
    winget install --id Gyan.FFmpeg -e --accept-package-agreements --accept-source-agreements
    echo [QUAN TRỌNG] Đã cài đặt xong FFmpeg. Vui lòng đóng cửa sổ này và chạy lại file install.bat!
    pause
    exit /b 1
)

echo ==============================================
echo CÀI ĐẶT TEXT-TO-SPEECH (BACKEND)
echo ==============================================
cd backend
if not exist "venv" (
    echo Đang tạo môi trường ảo Python (venv)...
    python -m venv venv
)
echo Đang cài đặt thư viện Python...
call venv\Scripts\activate
pip install -r requirements.txt
cd ..

echo.
echo ==============================================
echo CÀI ĐẶT TEXT-TO-SPEECH (FRONTEND)
echo ==============================================
cd frontend
if not exist ".env" (
    echo Đang tao file .env mac dinh...
    echo VITE_API_BASE_URL=http://localhost:8000> .env
)
echo Đang cài đặt thư viện Node.js...
call npm install
cd ..

echo.
echo ==============================================
echo CÀI ĐẶT HOÀN TẤT!
echo Vui lòng đọc file SETUP_GUIDE.md để biết cách chạy ứng dụng.
echo ==============================================
pause
