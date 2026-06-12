# Phase 02: Core TTS Logic & Chunking
Status: ✅ Complete
Dependencies: [Phase 01: Setup Environment](file:///d:/git/text-to-speed-internal/plans/260612-1022-vieneu-tts-gradio/phase-01-setup.md)

## Objective
Xây dựng logic nghiệp vụ lõi: load model VieNeu-TTS toàn cục, viết hàm chia nhỏ văn bản (chunking) tối ưu khoảng 200 ký tự và ghép nối âm thanh đầu ra.

## Requirements
### Functional
- Load model VieNeu-TTS một lần duy nhất khi khởi động (Global Cache).
- Hàm `split_text_by_punctuation(text, max_len=200)` để tách câu thông minh giữ nguyên dấu chấm/phẩy/xuống dòng.
- Hàm `generate_speech(text)` thực hiện:
  - Chia nhỏ văn bản thành các câu dưới 200 ký tự.
  - Chạy mô hình trên từng câu.
  - Sử dụng thư viện `soundfile` hoặc `wave` ghép nối các đoạn âm thanh thành 1 file `.wav` hoàn chỉnh.
  - Trả về đường dẫn của file âm thanh đầu ra.

### Non-Functional
- Tối ưu hóa việc sử dụng RAM/CPU khi xử lý nhiều câu liên tục.
- Tránh hiện tượng méo tiếng hoặc giật cục tại điểm nối âm thanh.

## Implementation Steps
1. [x] Khai báo biến global và load model `Vieneu()` trong `app.py`.
2. [x] Viết hàm phân mảnh văn bản tự động `split_text_by_punctuation`.
3. [x] Viết hàm sinh giọng nói `generate_speech` có ghép nối âm thanh qua `soundfile`.

## Files to Create/Modify
- `app.py` - [MODIFY] Thêm code core logic và ghép nối âm thanh.

## Test Criteria
- Chạy thử hàm `generate_speech` local với đoạn văn bản ngắn và văn bản dài (> 500 ký tự).
- Nghe thử file WAV đầu ra để đảm bảo âm thanh liền mạch, không lỗi.

---
Next Phase: [Phase 03: Gradio UI & REST API](file:///d:/git/text-to-speed-internal/plans/260612-1022-vieneu-tts-gradio/phase-03-backend.md)
