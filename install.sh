#!/bin/bash

echo "Kiểm tra môi trường..."
if ! command -v python3 &> /dev/null; then
    echo "[CẢNH BÁO] Không tìm thấy Python3! Đang thử cài đặt tự động..."
    if command -v apt &> /dev/null; then sudo apt update && sudo apt install -y python3 python3-venv python3-pip
    elif command -v brew &> /dev/null; then brew install python
    else echo "[LỖI] Không thể tự động cài. Vui lòng tự cài Python 3.9+."; exit 1; fi
fi

if ! command -v npm &> /dev/null; then
    echo "[CẢNH BÁO] Không tìm thấy Node.js! Đang thử cài đặt tự động..."
    if command -v apt &> /dev/null; then sudo apt update && sudo apt install -y nodejs npm
    elif command -v brew &> /dev/null; then brew install node
    else echo "[LỖI] Không thể tự động cài. Vui lòng tự cài Node.js v18+."; exit 1; fi
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "[CẢNH BÁO] Không tìm thấy FFmpeg! Đang thử cài đặt tự động..."
    if command -v apt &> /dev/null; then sudo apt update && sudo apt install -y ffmpeg
    elif command -v brew &> /dev/null; then brew install ffmpeg
    else echo "[LỖI] Không thể tự động cài. Vui lòng tự cài FFmpeg."; exit 1; fi
fi

echo "=============================================="
echo "CÀI ĐẶT TEXT-TO-SPEECH (BACKEND)"
echo "=============================================="
cd backend

if [ ! -d "venv" ]; then
    echo "Đang tạo môi trường ảo Python (venv)..."
    python3 -m venv venv
fi

echo "Đang cài đặt thư viện Python..."
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo ""
echo "=============================================="
echo "CÀI ĐẶT TEXT-TO-SPEECH (FRONTEND)"
echo "=============================================="
cd frontend
if [ ! -f ".env" ]; then
    echo "Đang tạo file .env mặc định..."
    echo "VITE_API_BASE_URL=http://localhost:8000" > .env
fi
echo "Đang cài đặt thư viện Node.js..."
npm install
cd ..

echo ""
echo "=============================================="
echo "CÀI ĐẶT HOÀN TẤT!"
echo "Vui lòng đọc file SETUP_GUIDE.md để biết cách chạy ứng dụng."
echo "=============================================="
