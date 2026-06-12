---
title: VieNeu-TTS Vietnamese Text To Speech
emoji: 🗣️
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 4.44.1
app_file: app.py
pinned: false
license: apache-2.0
python_version: 3.12
---

# VieNeu-TTS Vietnamese Text To Speech (Bilingual EN-VI)

Ứng dụng chuyển đổi văn bản tiếng Việt thành giọng nói (Text To Speech) chất lượng cao sử dụng mô hình offline **VieNeu-TTS** (0.3B/0.5B parameters), hỗ trợ đọc song ngữ Anh - Việt tự nhiên. 
Được thiết kế để chạy mượt mà trên môi trường CPU Basic (Free) của Hugging Face Spaces thông qua giao diện Gradio SDK và mở rộng cổng REST API `/api/tts`.

---

## 🚀 Hướng Dẫn Chạy Local (Local Development)

### 1. Cài đặt thư viện hệ thống
Mô hình yêu cầu gói hệ thống `espeak-ng` để phân tích âm vị học.
- **Windows:** Tải file cài đặt `.msi` từ trang GitHub [espeak-ng/espeak-ng](https://github.com/espeak-ng/espeak-ng) và cài đặt, sau đó thêm đường dẫn cài đặt vào biến môi trường `PATH`.
- **Ubuntu/Linux:**
  ```bash
  sudo apt-get update && sudo apt-get install -y espeak-ng
  ```
- **macOS:**
  ```bash
  brew install espeak-ng
  ```

### 2. Cài đặt thư viện Python
Di chuyển vào thư mục dự án và chạy cài đặt:
```bash
pip install -r requirements.txt
```
*Lưu ý:* Nếu chạy trên Windows gặp xung đột phiên bản `huggingface-hub` và `transformers`, vui lòng cài đặt đúng phiên bản:
```bash
pip install "gradio>=4.0.0,<5.0.0" "huggingface-hub<1.0"
```

### 3. Khởi chạy ứng dụng
Chạy file `app.py`:
```bash
python app.py
```
Sau khi khởi chạy thành công, truy cập giao diện web tại địa chỉ: `http://localhost:7860`

---

## ☁️ Hướng Dẫn Deploy lên Hugging Face Space

1. Đăng nhập vào tài khoản [huggingface.co](https://huggingface.co/).
2. Tạo một Space mới:
   - **SDK:** Chọn **Gradio**.
   - **Template:** Chọn **Blank**.
   - **Hardware:** Chọn **CPU Basic (Free)**.
3. Tải toàn bộ các file trong thư mục này lên Space vừa tạo:
   - `app.py` (Mã nguồn chạy web và REST API)
   - `requirements.txt` (Khai báo thư viện python cần cài đặt)
   - `packages.txt` (Khai báo gói hệ thống `espeak-ng` để Hugging Face tự động cài)
   - `README.md` (Tài liệu hướng dẫn và khai báo metadata)
4. Hugging Face sẽ tự động build và chạy Space của bạn chỉ sau vài phút.

---

## 🔌 Hướng Dẫn Tích Hợp API (JavaScript Integration)

### Cách 1: Gọi qua Gradio Client SDK
Sử dụng thư viện `@gradio/client` để gọi trực tiếp hàm xử lý của giao diện web:

```javascript
// Sử dụng ES Modules
import { Client } from "@gradio/client";

// Kết nối tới Hugging Face Space của bạn
const client = await Client.connect("username/space-name");

// Thực hiện dự báo (predict)
const result = await client.predict("/predict", {
  text: "Xin chào thế giới, đây là giọng đọc thử nghiệm từ client."
});

// Nhận về file âm thanh
console.log("Đường dẫn file audio kết quả:", result.data[0]);
```

### Cách 2: Gọi qua REST API `/api/tts` (Khuyên dùng)
Hệ thống tích hợp sẵn một endpoint API RESTful chuẩn để dễ dàng gọi bằng `fetch` thông thường từ bất kỳ ứng dụng nào:

- **Method:** `POST`
- **Endpoint:** `https://<username>-<space-name>.hf.space/api/tts` (Thay thế bằng URL Space của bạn)
- **Content-Type:** `application/json`

**Ví dụ code JavaScript gọi API:**

```javascript
const response = await fetch("https://username-space-name.hf.space/api/tts", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    text: "Xin chào thế giới! Tôi đang thử nghiệm REST API."
  })
});

const data = await response.json();

if (data.success) {
  console.log("Đường dẫn tải file âm thanh:", data.audio_url);
  // Có thể gán trực tiếp data.audio_url vào thẻ <audio src="..."> để phát trên web
} else {
  console.error("Lỗi sinh âm thanh:", data.error);
}
```

---

## ⚙️ Tính Năng Tối Ưu Tích Hợp Sẵn
- **Text Chunking (Cắt câu tự động):** Tự động chia nhỏ văn bản dài thành các phân đoạn ngắn dưới 200 ký tự để tối ưu tài nguyên CPU và mang lại ngữ điệu tự nhiên nhất.
- **Giới hạn đầu vào:** Hỗ trợ tối đa 5000 ký tự mỗi lượt đọc.
- **Auto Clean Cache (Tự động dọn dẹp):** Tự động quét và xóa sạch các file âm thanh cũ trên server sau 10 phút để đảm bảo không bị đầy dung lượng ổ đĩa của Space.
