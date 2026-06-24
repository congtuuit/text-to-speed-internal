#!/bin/bash

# ==============================================================================
# Setup Script for Text to Speed Internal on Linux VPS
# ==============================================================================

# Định nghĩa màu sắc cho đầu ra terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0;3c' # No Color
NC='\033[0m'

# Lấy thư mục chứa script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}        TEXT TO SPEED INTERNAL - LINUX VPS SETUP SCRIPT               ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# ------------------------------------------------------------------------------
# 1. Kiểm tra quyền Root/Sudo cho cài đặt hệ thống
# ------------------------------------------------------------------------------
IS_ROOT=false
if [ "$EUID" -eq 0 ]; then
    IS_ROOT=true
fi

# ------------------------------------------------------------------------------
# 2. Kiểm tra và cài đặt các gói hệ thống
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[1/6] Kiểm tra các gói hệ thống cần thiết...${NC}"

check_and_install() {
    local cmd=$1
    local package=$2
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${YELLOW}[WARNING] Không tìm thấy '$cmd'. Đang tiến hành cài đặt...${NC}"
        if [ "$IS_ROOT" = true ]; then
            if command -v apt &> /dev/null; then
                apt update && apt install -y $package
            elif command -v yum &> /dev/null; then
                yum install -y $package
            else
                echo -e "${RED}[ERROR] Không hỗ trợ trình quản lý gói tự động. Vui lòng cài đặt $package thủ công.${NC}"
                exit 1
            fi
        else
            echo -e "${RED}[ERROR] Cần quyền root (sudo) để cài đặt $package. Vui lòng chạy lại script bằng lệnh: sudo $0${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}[OK] $cmd đã được cài đặt.${NC}"
    fi
}

# Kiểm tra Python 3
check_and_install "python3" "python3 python3-pip python3-venv"

# Kiểm tra Node.js & NPM
check_and_install "npm" "nodejs npm"

# Kiểm tra FFmpeg (bắt buộc để xử lý âm thanh)
check_and_install "ffmpeg" "ffmpeg"

# Kiểm tra Nginx
check_and_install "nginx" "nginx"

# ------------------------------------------------------------------------------
# 3. Khởi tạo Backend (Python FastAPI)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[2/6] Thiết lập Backend (FastAPI)...${NC}"
cd "$SCRIPT_DIR/backend"

if [ ! -d "venv" ]; then
    echo "Đang tạo môi trường ảo Python (venv)..."
    python3 -m venv venv
fi

echo "Đang kích hoạt venv và cài đặt dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Tạo file .env nếu chưa có
if [ ! -f ".env" ]; then
    echo "Khởi tạo file backend .env mặc định..."
    cat <<EOT > .env
DATABASE_URL=sqlite:///./tts_batch.db
PORT=8000
# Thêm API Keys của bạn vào đây:
# FPT_API_KEYS=key1,key2
# GEMINI_API_KEY=your_gemini_key
EOT
    echo -e "${GREEN}[OK] Đã tạo file backend/.env${NC}"
fi

# ------------------------------------------------------------------------------
# 4. Khởi tạo Frontend (React + Vite)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[3/6] Thiết lập Frontend (React + Vite)...${NC}"
cd "$SCRIPT_DIR/frontend"

# Prompt cấu hình địa chỉ Backend API
echo -e "${BLUE}Nhập Domain hoặc IP của VPS (Ví dụ: tts.example.com hoặc 123.45.67.89).${NC}"
echo -e "${BLUE}Nếu để trống, sẽ mặc định sử dụng đường dẫn tương đối '/api' (Rất tốt khi cấu hình Nginx reverse proxy):${NC}"
read -p "Domain/IP: " USER_DOMAIN

API_URL="/api"
if [ ! -z "$USER_DOMAIN" ]; then
    # Thêm http:// nếu chưa có
    if [[ ! "$USER_DOMAIN" =~ ^https?:// ]]; then
        API_URL="http://$USER_DOMAIN/api"
    else
        API_URL="$USER_DOMAIN/api"
    fi
fi

# Tạo hoặc cập nhật .env.production cho frontend
echo "Tạo file frontend/.env.production với VITE_API_BASE_URL=$API_URL"
echo "VITE_API_BASE_URL=$API_URL" > .env.production

echo "Đang cài đặt các thư viện Node.js..."
npm install

echo "Đang chạy build Frontend..."
npm run build
echo -e "${GREEN}[OK] Frontend đã được build thành công tại frontend/dist${NC}"

# ------------------------------------------------------------------------------
# 5. Phân quyền SQLite
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[4/6] Thiết lập phân quyền thư mục cho SQLite...${NC}"
# Đảm bảo www-data (hoặc user hiện tại) ghi được vào folder backend (nơi chứa db file)
if [ "$IS_ROOT" = true ]; then
    echo "Đang cấp quyền ghi thư mục backend cho www-data..."
    chown -R www-data:www-data "$SCRIPT_DIR/backend"
    chmod -R 775 "$SCRIPT_DIR/backend"
    echo -e "${GREEN}[OK] Đã phân quyền thành công.${NC}"
else
    echo -e "${YELLOW}[WARNING] Không chạy dưới quyền root, bỏ qua bước phân quyền www-data cho SQLite.${NC}"
    echo -e "Hãy đảm bảo user chạy ứng dụng có quyền ghi vào thư mục: $SCRIPT_DIR/backend"
fi

# ------------------------------------------------------------------------------
# 6. Tạo File cấu hình Systemd & Nginx (Tùy chọn)
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[5/6] Tạo file cấu hình dịch vụ hệ thống...${NC}"

# Tạo file cấu hình mẫu systemd tại chỗ để người dùng copy
cat <<EOT > "$SCRIPT_DIR/tts-backend.service.template"
[Unit]
Description=FastAPI Text-to-Speed Backend
After=network.target

[Service]
User=$(whoami)
WorkingDirectory=$SCRIPT_DIR/backend
ExecStart=$SCRIPT_DIR/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
Environment="PATH=$SCRIPT_DIR/backend/venv/bin"

[Install]
WantedBy=multi-user.target
EOT

# Xác định domain cho nginx template
NGINX_DOMAIN="yourdomain.com"
if [ ! -z "$USER_DOMAIN" ]; then
    # Lấy domain bỏ đi http:// hoặc https://
    NGINX_DOMAIN=$(echo "$USER_DOMAIN" | sed -e 's|^https\?://||' -e 's|/api$||')
fi

# Tạo file cấu hình mẫu Nginx tại chỗ
cat <<EOT > "$SCRIPT_DIR/nginx-tts.conf.template"
server {
    listen 80;
    server_name $NGINX_DOMAIN;

    root $SCRIPT_DIR/frontend/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        
        proxy_read_timeout 600s;
        proxy_connect_timeout 600s;
        proxy_send_timeout 600s;
    }
}
EOT

echo -e "${GREEN}[OK] Đã tạo các file template cấu hình:${NC}"
echo -e "  - ${BLUE}$SCRIPT_DIR/tts-backend.service.template${NC}"
echo -e "  - ${BLUE}$SCRIPT_DIR/nginx-tts.conf.template${NC}"

if [ "$IS_ROOT" = true ]; then
    read -p "Bạn có muốn áp dụng trực tiếp cấu hình Nginx và Systemd lên hệ thống luôn không? (y/n): " APPLY_CONFIG
    if [ "$APPLY_CONFIG" = "y" ] || [ "$APPLY_CONFIG" = "Y" ]; then
        echo "Đang cài đặt service tts-backend..."
        cp "$SCRIPT_DIR/tts-backend.service.template" /etc/systemd/system/tts-backend.service
        systemctl daemon-reload
        systemctl start tts-backend
        systemctl enable tts-backend

        echo "Đang cấu hình Nginx..."
        cp "$SCRIPT_DIR/nginx-tts.conf.template" /etc/nginx/sites-available/text-to-speed
        ln -sf /etc/nginx/sites-available/text-to-speed /etc/nginx/sites-enabled/
        # Xóa default nếu tồn tại
        [ -f /etc/nginx/sites-enabled/default ] && rm /etc/nginx/sites-enabled/default
        
        nginx -t && systemctl restart nginx
        echo -e "${GREEN}[SUCCESS] Đã khởi chạy dịch vụ backend và cấu hình Nginx thành công!${NC}"
    fi
fi

# ------------------------------------------------------------------------------
# Kết thúc
# ------------------------------------------------------------------------------
echo -e "\n${YELLOW}[6/6] Hoàn tất thiết lập!${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}    Chúc mừng! Ứng dụng Text to Speed Internal đã sẵn sàng.${NC}"
echo -e "${BLUE}======================================================================${NC}"
if [ "$IS_ROOT" = false ]; then
    echo -e "Các bước tiếp theo bạn cần tự thực hiện bằng quyền sudo:"
    echo -e "1. Copy file service: ${YELLOW}sudo cp $SCRIPT_DIR/tts-backend.service.template /etc/systemd/system/tts-backend.service${NC}"
    echo -e "2. Chạy service: ${YELLOW}sudo systemctl daemon-reload && sudo systemctl enable --now tts-backend${NC}"
    echo -e "3. Cấu hình Nginx: ${YELLOW}sudo cp $SCRIPT_DIR/nginx-tts.conf.template /etc/nginx/sites-available/text-to-speed${NC}"
    echo -e "4. Kích hoạt Nginx site: ${YELLOW}sudo ln -s /etc/nginx/sites-available/text-to-speed /etc/nginx/sites-enabled/ && sudo systemctl restart nginx${NC}"
fi
echo -e "${BLUE}======================================================================${NC}\n"
