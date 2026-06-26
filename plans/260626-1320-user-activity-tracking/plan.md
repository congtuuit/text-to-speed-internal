# Plan: User Activity Tracking & Admin View
Created: 2026-06-26T13:20:00+07:00
Status: In Progress

## Overview
Triển khai tính năng theo dõi thời điểm đăng nhập cuối cùng (`last_login_at`), thời gian hoạt động cuối (`last_active_at`) và trạng thái hoạt động trực tuyến (Online/Offline) của người dùng, hiển thị trực quan trên giao diện quản lý Admin.

## Goals
- Lưu trữ thời gian đăng nhập mới nhất của người dùng.
- Tự động cập nhật thời gian tương tác cuối cùng qua các yêu cầu API.
- Hiển thị trạng thái Online (đang hoạt động trong vòng 5 phút) / Offline trong trang quản trị.
- Thêm cột thời gian đăng nhập cuối cùng vào bảng quản lý người dùng.

## Out of Scope
- Theo dõi vị trí địa lý hoặc IP chi tiết của người dùng.
- Triển khai WebSocket thời gian thực (chỉ cập nhật qua HTTP requests/pings thông thường).

## Users
- **Admin**: Cần biết người dùng nào đang online và tài khoản nào hoạt động gần đây để hỗ trợ và tối ưu hóa hệ thống.

## MVP Features
- **Database Schema**: Thêm trường `last_login_at` và `last_active_at` vào bảng `users`.
- **Backend Middleware/Helper**: Cập nhật timestamps khi đăng nhập và khi gọi API (áp dụng debounce 1 phút để tránh nghẽn DB).
- **Admin API**: Trả về thêm `last_login_at`, `last_active_at` và trạng thái `is_online` từ endpoint `/api/admin/users`.
- **Frontend Admin Panel**: Cập nhật `UsersTab.jsx` hiển thị cột đăng nhập cuối cùng và icon Online/Offline.

## Key Decisions
- Định nghĩa **Online**: Người dùng có `last_active_at` trong vòng 5 phút trở lại đây.
- Tránh ghi DB quá tải: Chỉ cập nhật `last_active_at` khi sự chênh lệch so với giá trị cũ lớn hơn 60 giây.

## Risks / Open Questions
- **SQLite Migration**: SQLite không hỗ trợ thay đổi cấu trúc bảng linh hoạt như PostgreSQL, do đó cần chạy lệnh `ALTER TABLE` cẩn thận hoặc viết script Python tự động thêm cột nếu chưa tồn tại để tránh hỏng DB.

## Phases
| Phase | Name | Status | Notes |
|---|---|---|---|
| 01 | Database Migration | Completed | Thêm các cột cần thiết vào bảng `users` |
| 02 | Backend Logic Implementation | Completed | Cập nhật timestamps khi login/request, bổ sung dữ liệu trả về API admin |
| 03 | Frontend UI Integration | Completed | Cập nhật giao diện Admin hiển thị trạng thái và thời gian |

## Next Step
Mọi tính năng đã được triển khai đầy đủ. Hãy chạy thử và kiểm nghiệm kết quả.
