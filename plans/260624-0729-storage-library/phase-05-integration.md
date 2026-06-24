# Phase 05: Integration & Testing
Status: ⬜ Pending
Dependencies: Phase 04

## Objective
Kết nối toàn bộ hệ thống từ Backend đến Frontend, kiểm thử cả 2 chế độ lưu trữ (Local VPS & AWS R2/S3) và tối ưu hóa trải nghiệm người dùng.

## Requirements
### Functional
- Luồng hoạt động khép kín: Chạy Job -> Tạo file -> Lưu Storage -> Hiện ở Thư Viện -> Phát online / Xóa thành công.
- Hỗ trợ đổi chế độ lưu trữ qua cấu hình settings (hoặc file `.env`).

### Non-Functional
- Kiểm soát lỗi ngoại lệ (exception handling) khi upload cloud thất bại (sẽ fallback lưu local và báo lỗi/cảnh báo lên UI).

## Implementation Steps
1. [ ] Thực hiện kiểm thử tích hợp (End-to-End Test) với chế độ lưu trữ `local`:
   - Tạo một batch job ngắn.
   - Kiểm tra xem file audio có xuất hiện trong Thư Viện sau khi chạy xong không.
   - Bấm phát nhạc trực tiếp để nghe thử xem có chạy mượt không.
2. [ ] Thực hiện kiểm thử tích hợp với chế độ lưu trữ `r2`:
   - Điền key R2 tạm thời vào `.env`.
   - Tạo job mới và verify xem file có được đẩy lên cloud và trả về link đúng chuẩn không.
3. [ ] Xóa file kiểm thử thông qua giao diện để verify tính năng dọn dẹp vật lý ở cả đĩa cứng local và trên cloud R2.

## Files to Create/Modify
- Các file liên quan trong quá trình sửa lỗi (bug fixing).

## Test Criteria
- [ ] Mọi file âm thanh sau khi hoàn tất đều nghe được trực tuyến.
- [ ] Tính năng xóa dọn dẹp hoạt động chính xác, không để lại file rác chiếm dung lượng ổ cứng.

---
Next Phase: None (End of Plan)
