# Hướng Dẫn Triển Khai (Deployment Guide) Lên VPS Linux

Tài liệu này hướng dẫn chi tiết các bước thiết lập, cấu hình và chạy ứng dụng **Text to Speed Internal** trên môi trường VPS Linux (Khuyên dùng: **Ubuntu 22.04 LTS**).

---

## 📋 Kiến Trúc Triển Khai (Deployment Architecture)

Mô hình triển khai chuẩn gồm các thành phần sau:
*   **Web Server (Nginx):** Đóng vai trò Reverse Proxy (Proxy ngược), tiếp nhận yêu cầu từ client (trình duyệt).
    *   Yêu cầu tĩnh (Frontend): Nginx phục vụ trực tiếp các file HTML/JS/CSS đã build.
    *   Yêu cầu API (Backend): Nginx chuyển tiếp (proxy) sang cổng chạy backend FastAPI.
*   **Backend Engine (FastAPI + Uvicorn):** Chạy ngầm thông qua `systemd` để tự động khôi phục khi gặp sự cố.
*   **Database (SQLite):** Một file vật lý lưu trữ trong thư mục dự án (`tts_batch.db`).
*   **FFmpeg:** Công cụ xử lý âm thanh (tăng tốc độ, chuyển đổi định dạng).

---

## 🛠️ Bước 1: Cài Đặt Các Gói Hệ Thống (Prerequisites)

Kết nối vào VPS thông qua SSH và cập nhật hệ thống:

```bash
sudo apt update && sudo apt upgrade -y
```

Cài đặt các công cụ cần thiết (Git, Node.js, Python, Nginx, FFmpeg):

```bash
# 1. Cài đặt Python 3 và Pip
sudo apt install python3 python3-pip python3-venv -y

# 2. Cài đặt Node.js (Version 18+) & NPM
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Cài đặt FFmpeg để xử lý Audio
sudo apt install ffmpeg -y

# 4. Cài đặt Nginx
sudo apt install nginx -y
```

Kiểm tra xem các công cụ đã được cài đặt thành công:
```bash
python3 --version
node -v
ffmpeg -version
nginx -v
```

---

## 📂 Bước 2: Tải Mã Nguồn & Cấu Hình Môi Trường

1.  **Clone mã nguồn từ Git về VPS:**
    ```bash
    cd /var/www
    sudo git clone <URL_KHO_MA_NGUON> text-to-speed
    sudo chown -R $USER:$USER /var/www/text-to-speed
    cd /var/www/text-to-speed
    ```

2.  **Cấu hình biến môi trường cho Backend:**
    Tạo file `.env` trong thư mục `backend/`:
    ```bash
    nano backend/.env
    ```
    Thêm vào các cấu hình mong muốn (ví dụ API key FPT, Gemini...):
    ```env
    FPT_API_KEYS=key1,key2,key3
    GEMINI_API_KEY=your_gemini_key
    DATABASE_URL=sqlite:///./tts_batch.db
    PORT=8000
    ```

---

## 🐍 Bước 3: Cài Đặt & Cấu Hình Backend (FastAPI)

1.  **Tạo môi trường ảo Python (Virtual Environment):**
    ```bash
    cd /var/www/text-to-speed/backend
    python3 -m venv venv
    source venv/bin/activate
    ```

2.  **Cài đặt các thư viện phụ thuộc (Dependencies):**
    ```bash
    pip install --upgrade pip
    pip install -r requirements.txt
    ```

3.  **Tạo Systemd Service để chạy ngầm Backend:**
    Tạo một file service để quản lý tiến trình FastAPI:
    ```bash
    sudo nano /etc/systemd/system/tts-backend.service
    ```
    Dán nội dung sau vào file:
    ```ini
    [Unit]
    Description=FastAPI Text-to-Speed Backend
    After=network.target

    [Service]
    User=www-data
    WorkingDirectory=/var/www/text-to-speed/backend
    ExecStart=/var/www/text-to-speed/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 4
    Restart=always
    Environment="PATH=/var/www/text-to-speed/backend/venv/bin"

    [Install]
    WantedBy=multi-user.target
    ```

4.  **Phân quyền ghi file Database cho người dùng `www-data`:**
    SQLite cần ghi dữ liệu vào thư mục backend, do đó thư mục này cần thuộc quyền sở hữu của `www-data`:
    ```bash
    sudo chown -R www-data:www-data /var/www/text-to-speed/backend
    ```

5.  **Khởi động dịch vụ Backend:**
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl start tts-backend
    sudo systemctl enable tts-backend
    ```
    Kiểm tra trạng thái backend:
    ```bash
    sudo systemctl status tts-backend
    ```

---

## 🎨 Bước 4: Cài Đặt & Build Frontend (React + Vite)

1.  **Di chuyển vào thư mục frontend:**
    ```bash
    cd /var/www/text-to-speed/frontend
    ```

2.  **Cấu hình API URL cho production:**
    Tạo file `.env.production`:
    ```bash
    nano .env.production
    ```
    Điền URL trỏ đến tên miền hoặc IP của VPS (đã qua proxy Nginx):
    ```env
    VITE_API_URL=/api
    ```
    *(Dùng `/api` giúp tận dụng cơ chế reverse proxy của Nginx mà không cần bật CORS phức tạp).*

3.  **Cài đặt packages và Build:**
    ```bash
    npm install
    npm run build
    ```
    Sau khi chạy xong, thư mục `/var/www/text-to-speed/frontend/dist` chứa toàn bộ code tĩnh sẽ được tạo ra.

---

## 🌐 Bước 5: Cấu Hình Nginx Reverse Proxy

1.  **Tạo file cấu hình site mới trong Nginx:**
    ```bash
    sudo nano /etc/nginx/sites-available/text-to-speed
    ```

2.  **Dán cấu hình sau (Thay `yourdomain.com` bằng IP hoặc Tên miền thực tế):**
    ```nginx
    server {
        listen 80;
        server_name yourdomain.com; # Thay thế bằng domain của bạn hoặc địa chỉ IP VPS

        # Đường dẫn đến thư mục build của Frontend
        root /var/www/text-to-speed/frontend/dist;
        index index.html;

        # Cấu hình Routing cho Single Page Application (React Router)
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Chuyển tiếp (Proxy) các yêu cầu API sang Backend FastAPI
        location /api/ {
            proxy_pass http://127.0.0.1:8000/;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # Tăng timeout khi convert file lớn
            proxy_read_timeout 600s;
            proxy_connect_timeout 600s;
            proxy_send_timeout 600s;
        }
    }
    ```

3.  **Kích hoạt cấu hình và restart Nginx:**
    ```bash
    sudo ln -s /etc/nginx/sites-available/text-to-speed /etc/nginx/sites-enabled/
    # Xóa cấu hình mặc định nếu không sử dụng
    sudo rm /etc/nginx/sites-enabled/default
    
    # Kiểm tra lỗi cú pháp Nginx
    sudo nginx -t
    
    # Reload lại Nginx
    sudo systemctl restart nginx
    ```

---

## 🔒 Bước 6: Cấu Hình SSL Miễn Phí (HTTPS) với Let's Encrypt (Tùy chọn)

Nếu bạn sử dụng tên miền thực tế (không phải IP), hãy kích hoạt HTTPS để tăng tính bảo mật:

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```
Làm theo hướng dẫn trên màn hình, Certbot sẽ tự cấu hình SSL vào Nginx và thiết lập tự động gia hạn chứng chỉ (cron job).

---

## 🔍 Kiểm Tra & Sửa Lỗi Thường Gặp (Troubleshooting)

1.  **Lỗi không ghi được Database (SQLite):**
    *   *Triệu chứng:* Không tạo được batch job mới, báo lỗi ghi file.
    *   *Khắc phục:* Đảm bảo cả thư mục backend và file `tts_batch.db` thuộc sở hữu của `www-data`:
        ```bash
        sudo chown -R www-data:www-data /var/www/text-to-speed/backend
        ```

2.  **Lỗi FFmpeg không chạy:**
    *   *Triệu chứng:* Task chạy nhưng phần ghép/tăng tốc audio báo lỗi.
    *   *Khắc phục:* Đảm bảo `ffmpeg` đã nằm trong PATH hệ thống và user `www-data` có quyền thực thi. Bạn có thể kiểm tra bằng lệnh: `sudo -u www-data ffmpeg -version`.

3.  **Xem log hệ thống để debug:**
    *   *Xem log backend:* `sudo journalctl -u tts-backend -f`
    *   *Xem log nginx:* `sudo tail -f /var/log/nginx/error.log`
