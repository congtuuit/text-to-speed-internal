# Hoàn tất xây dựng Tool Batch TTS

Dự án đã được triển khai thành công với kiến trúc gồm:
1. **Backend**: Python FastAPI + SQLite.
2. **Frontend**: React (Vite) với giao diện Dark Mode / Glassmorphism tuyệt đẹp.

## Hướng dẫn khởi chạy (Run & Test)

Bạn cần mở 2 Terminal (màn hình dòng lệnh) riêng biệt để chạy Backend và Frontend.

### 1. Chạy Backend (FastAPI)
Mở Terminal 1, di chuyển vào thư mục dự án và chạy:
```powershell
cd d:\git\text-to-speed-internal\backend
pip install -r requirements.txt
uvicorn main:app --reload
```
> [!NOTE]
> Server Backend sẽ chạy tại địa chỉ: `http://localhost:8000`
> Ngay khi khởi chạy, file database `tts_batch.db` sẽ tự động được tạo nhờ SQLAlchemy. Module `QueueManager` cũng sẽ khởi động và chờ xử lý file.

### 2. Chạy Frontend (React + Vite)
Mở Terminal 2, di chuyển vào thư mục dự án và chạy:
```powershell
cd d:\git\text-to-speed-internal\frontend
npm run dev
```
> [!NOTE]
> Giao diện người dùng (UI) sẽ chạy tại địa chỉ: `http://localhost:5173`. Bạn hãy mở link này trên trình duyệt Chrome hoặc Edge.

## Hướng dẫn sử dụng thử (Verification)

1. Tạo một thư mục mẫu chứa các file `.txt` (Ví dụ: `D:\Truyen\input` gồm các file `chuong1.txt`, `chuong2.txt`).
2. Mở trình duyệt `http://localhost:5173`.
3. Điền đường dẫn thư mục vào ô **Input Directory** và nhấn **Scan Files**.
4. Điền đường dẫn thư mục xuất file vào ô **Output Directory** (Ví dụ: `D:\Truyen\output`).
5. Chọn giọng đọc.
6. Bấm nút **START BATCH CONVERSION**.

> [!TIP]
> Hiện tại API gọi Gemini TTS đang được **Mock (giả lập)** tốn khoảng 2 giây/file và xuất ra file MP3 rỗng chứa một đoạn text mẫu. Điều này giúp bạn kiểm thử Queue và xem Progress Bar mượt mà mà chưa cần dùng API thật. 
> 
> Để tích hợp API thật sau này, bạn chỉ cần mở file [tts_provider.py](file:///d:/git/text-to-speed-internal/backend/services/tts_provider.py) và thay đoạn Mock bằng thư viện `google-genai` hoặc HTTP Request.

## Hình ảnh UI (Minh họa)

Bên dưới là cấu trúc hệ thống:
```mermaid
graph LR
  A[React Frontend] -- HTTP POST --> B[FastAPI Backend]
  B -- Ghi file task --> C[(SQLite Database)]
  D[Queue Manager Background] -- Quét file Pending --> C
  D -- Xử lý file .txt --> E[TTS Provider]
  E -- Ghi file --> F[Folder Output .mp3]
  D -- Đánh dấu Done --> C
  A -- Polling Progress --> B

---

## Tích hợp mới: Hugging Face Space & REST API (VieNeu-TTS)

Chúng ta đã xây dựng thành công bộ mã nguồn hoàn chỉnh để deploy website Text-to-Speech (VieNeu-TTS) lên Hugging Face Spaces đặt trong thư mục [huggingface_space/](file:///d:/git/text-to-speed-internal/huggingface_space/).

### 📂 Cấu trúc thư mục deploy:
- **[app.py](file:///d:/git/text-to-speed-internal/huggingface_space/app.py)**: Chứa code logic load model VieNeu-TTS, thuật toán tự động tách câu thông minh (dưới 200 ký tự), FastAPI API Server (POST `/api/tts`), Gradio UI và cơ chế tự động dọn dẹp file tạm sau 10 phút.
- **[requirements.txt](file:///d:/git/text-to-speed-internal/huggingface_space/requirements.txt)**: Khai báo đầy đủ các dependencies cần thiết (`gradio`, `fastapi`, `uvicorn`, `torch`, `vieneu`, `soundfile`, `numpy`).
- **[packages.txt](file:///d:/git/text-to-speed-internal/huggingface_space/packages.txt)**: Khai báo gói hệ thống `espeak-ng` cho Hugging Face Spaces.
- **[README.md](file:///d:/git/text-to-speed-internal/huggingface_space/README.md)**: Chứa metadata khai báo Hugging Face Spaces và hướng dẫn chi tiết cách deploy/tích hợp API.

### 🧪 Kết quả kiểm thử tích hợp (Local Integration Test):
Đã chạy kiểm thử tự động thành công (tất cả các kịch bản đều đạt):
1. **Kiểm thử Validate giới hạn ký tự**: Gửi văn bản 5001 ký tự trả về đúng lỗi validation.
2. **Kiểm thử Auto-cleanup**: File tạm cũ (15 phút trước) được quét và xóa tự động thành công khi có request mới.
3. **Kiểm thử REST API**: Route `POST /api/tts` trả về URL file âm thanh tĩnh chính xác và cho phép tải về đầy đủ.

```
