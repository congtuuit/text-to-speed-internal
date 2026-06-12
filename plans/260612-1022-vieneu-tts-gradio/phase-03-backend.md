# Phase 03: Gradio UI & REST API
Status: ✅ Complete
Dependencies: [Phase 02: Core TTS Logic & Chunking](file:///d:/git/text-to-speed-internal/plans/260612-1022-vieneu-tts-gradio/phase-02-backend.md)

## Objective
Xây dựng giao diện web thân thiện bằng Gradio và mở endpoint REST API `/api/tts` dùng FastAPI.

## Requirements
### Functional
- Giao diện Gradio gồm:
  - Tiêu đề: "VieNeu-TTS Vietnamese Text To Speech"
  - Mô tả: "Chuyển văn bản tiếng Việt thành giọng nói bằng VieNeu-TTS"
  - Input: Hộp nhập Textbox nhiều dòng.
  - Button: "Tạo giọng đọc".
  - Output: Audio player trực quan và file download.
- Endpoint API `/api/tts`:
  - Request: POST `{ "text": "..." }`
  - Response: JSON `{ "success": true, "audio_url": "..." }` (sử dụng Gradio/FastAPI endpoint).

### Non-Functional
- Giao diện phản hồi trực quan, dễ dùng trên cả điện thoại và máy tính.
- Endpoint API đáp ứng nhanh, định dạng trả về chuẩn JSON.

## Implementation Steps
1. [x] Sử dụng `gradio.mount_to_fastapi` hoặc mount Gradio làm ASGI app để chạy chung port với FastAPI.
2. [x] Thiết kế giao diện Gradio với đầy đủ input/output như đặc tả.
3. [x] Định nghĩa route POST `/api/tts` trong FastAPI, gọi hàm `generate_speech` và trả về kết quả JSON.

## Files to Create/Modify
- `app.py` - [MODIFY] Tích hợp Gradio UI và FastAPI routes.

## Test Criteria
- Khởi chạy `python app.py` local, mở trình duyệt truy cập giao diện Gradio.
- Dùng `curl` hoặc Postman gửi request POST tới `/api/tts` và kiểm tra response trả về.

---
Next Phase: [Phase 04: Optimization & Error Handling](file:///d:/git/text-to-speed-internal/plans/260612-1022-vieneu-tts-gradio/phase-04-backend.md)
