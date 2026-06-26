# Phase 03: Frontend UI Integration
Status: Completed
Dependencies: Phase 02

## Objective
Cập nhật giao diện Admin để hiển thị trực quan trạng thái online/offline và thời gian đăng nhập cuối của người dùng.

## Tasks
- [x] Cập nhật file [UsersTab.jsx](file:///d:/git/text-to-speed-internal/frontend/src/components/admin/UsersTab.jsx):
  * Thêm cột **"Đăng nhập cuối"** vào tiêu đề và nội dung bảng.
  * Định dạng hiển thị thời gian đăng nhập cuối dễ nhìn (ví dụ: sử dụng hàm chuyển đổi sang định dạng locale hoặc thời gian tương đối như "2 phút trước", "Hôm qua lúc...").
  * Thiết kế nhãn trạng thái trực tuyến: thêm biểu tượng chấm tròn màu xanh lá cây 🟢 hoặc badge "Online" khi `user.is_online` là true, ngược lại hiển thị màu xám/badge "Offline" đi kèm ghi chú thời gian hoạt động cuối (ví dụ: "Hoạt động: 10 phút trước").
- [x] Kiểm tra giao diện chạy thực tế, xác nhận giao diện hiển thị gọn đẹp, responsive, đồng bộ tốt thông tin từ API.

## Files Likely Touched
- `frontend/src/components/admin/UsersTab.jsx` - Giao diện hiển thị bảng danh sách người dùng.

## Acceptance Criteria
- [x] Bảng quản trị người dùng hiển thị đầy đủ thông tin online/offline và ngày đăng nhập cuối.
- [x] Layout bảng không bị vỡ hay lệch dòng sau khi thêm cột mới.
- [x] Trạng thái thay đổi nhạy bén (thử mở 1 trình duyệt ẩn danh đăng nhập bằng tài khoản khác và xem tài khoản đó hiển thị "Online" ngay lập tức trên dashboard Admin).
