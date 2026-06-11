# Hướng Dẫn Cài Đặt Text-To-Speech Tool

Tài liệu này hướng dẫn chi tiết từng bước để thiết lập và chạy toàn bộ dự án (Backend & Frontend) trên một máy tính hoàn toàn mới.

## 1. Yêu cầu hệ thống (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các phần mềm sau:

1. **Python 3.9+** (Khuyên dùng Python 3.10 trở lên)
   - Tải tại: [python.org/downloads](https://www.python.org/downloads/)
   - *Lưu ý (Windows)*: Nhớ tích vào ô **"Add Python to PATH"** khi cài đặt.

2. **Node.js (v18 trở lên)**
   - Tải tại: [nodejs.org](https://nodejs.org/)

3. **FFmpeg** (Bắt buộc để hệ thống có thể xử lý và ghép nối các file âm thanh `.mp3` / `.wav`)
   - **Windows**: 
     - Tải [FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/).
     - Giải nén, copy thư mục `bin` và thêm đường dẫn của thư mục `bin` vào biến môi trường **System PATH**.
   - **macOS**: Chạy lệnh `brew install ffmpeg`
   - **Linux (Ubuntu)**: Chạy lệnh `sudo apt install ffmpeg`

4. **Git**
   - Tải tại: [git-scm.com](https://git-scm.com/)

---

## 2. Cài đặt Backend (Python / FastAPI)

Mở Terminal / Command Prompt và thực hiện:

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo môi trường ảo (Virtual Environment)
python -m venv venv

# 3. Kích hoạt môi trường ảo
# -> Đối với Windows:
venv\Scripts\activate
# -> Đối với macOS/Linux:
source venv/bin/activate

# 4. Cài đặt các thư viện cần thiết
pip install -r requirements.txt
```

---

## 3. Cài đặt Frontend (React / Vite)

Mở một cửa sổ Terminal **hoàn toàn mới** (để giữ Terminal Backend lát nữa chạy server):

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói thư viện Node.js
npm install
```

---

## 4. Hướng dẫn Chạy Ứng dụng (Run the App)

Để ứng dụng hoạt động, bạn cần chạy song phục cả Backend và Frontend.

### Bước 4.1: Chạy Backend
Trong Terminal đang ở thư mục `backend` (nhớ đảm bảo chữ `(venv)` đang hiện ở đầu dòng lệnh):
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
*Backend sẽ chạy ở địa chỉ: `http://localhost:8000`*

### Bước 4.2: Chạy Frontend
Trong Terminal thứ hai đang ở thư mục `frontend`:
```bash
npm run dev
```
*Frontend sẽ tự động khởi chạy, thường ở địa chỉ: `http://localhost:5173`*

---

## 5. Kiểm tra ứng dụng
- Mở trình duyệt và truy cập: **[http://localhost:5173](http://localhost:5173)**
- Vào phần **Cài Đặt** (Icon bánh răng) để cấu hình API Key (Gemini, FPT, hoặc Vieneu) trước khi sử dụng.
- Thử gửi một câu văn ngắn để test xem hệ thống và FFmpeg đã hoạt động trơn tru chưa.

🎉 **Chúc bạn cài đặt thành công!**
