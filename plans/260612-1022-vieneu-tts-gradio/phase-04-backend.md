# Phase 04: Optimization & Error Handling
Status: ✅ Complete
Dependencies: [Phase 03: Gradio UI & REST API](file:///d:/git/text-to-speed-internal/plans/260612-1022-vieneu-tts-gradio/phase-03-backend.md)

## Objective
Tối ưu hóa tài nguyên hệ thống (xóa file âm thanh tạm thời cũ, giới hạn ký tự) và cài đặt cơ chế bắt lỗi an toàn.

## Requirements
### Functional
- Giới hạn tối đa văn bản đầu vào là 5000 ký tự (nếu quá thì hiển thị cảnh báo thân thiện).
- Viết tiến trình nền hoặc luồng xóa tự động các file âm thanh tạm (.wav) trong thư mục output đã tồn tại lâu hơn 10-15 phút.
- Bắt mọi ngoại lệ (exceptions) xảy ra khi chạy model, ghi log chi tiết và hiển thị thông báo lỗi thân thiện cho người dùng cuối trên UI/API.

### Non-Functional
- Ngăn ngừa tình trạng tràn bộ nhớ đĩa (Disk Full) trên máy chủ Hugging Face Spaces do tích tụ các file âm thanh tạm thời.
- Hệ thống hoạt động tin cậy, không bị crash toàn bộ server khi có lỗi xử lý của 1 request.

## Implementation Steps
1. [x] Thêm điều kiện kiểm tra độ dài văn bản đầu vào <= 5000 ký tự trong cả Gradio UI và API endpoint.
2. [x] Viết hàm `cleanup_temp_audio` quét thư mục lưu audio và xóa các file đã được tạo quá 10 phút. Gọi hàm này định kỳ khi sinh audio mới.
3. [x] Sử dụng khối `try-except` toàn diện bao quanh logic sinh âm thanh và API.

## Files to Create/Modify
- `app.py` - [MODIFY] Bổ sung code validation, cleanup và try-except.

## Test Criteria
- Nhập văn bản > 5000 ký tự và xác nhận hệ thống hiển thị cảnh báo lỗi chính xác.
- Tạo liên tục 5-10 file audio, kiểm tra xem các file cũ có được tự động dọn dẹp sau thời gian cài đặt không.

---
Next Phase: [Phase 05: Hugging Face Space Docs & Deployment Prep](file:///d:/git/text-to-speed-internal/plans/260612-1022-vieneu-tts-gradio/phase-05-backend.md)
