# Phase 02: Backend Logic Implementation
Status: Completed
Dependencies: Phase 01

## Objective
Cập nhật logic ghi nhận timestamp khi người dùng đăng nhập hoặc hoạt động, và cung cấp thông tin đó qua Admin API.

## Tasks
- [x] Cập nhật routes đăng nhập `/api/auth/login`, `/api/auth/google`, và đăng ký `/api/auth/register` trong [auth.py](file:///d:/git/text-to-speed-internal/backend/routers/auth.py) để gán `last_login_at` và `last_active_at` về thời gian hiện tại (`datetime.utcnow()`).
- [x] Cập nhật hàm helper xác thực `_current_user_from_request` trong [auth.py](file:///d:/git/text-to-speed-internal/backend/routers/auth.py):
  * Kiểm tra chênh lệch thời gian giữa thời điểm hiện tại và `last_active_at` của user.
  * Nếu chênh lệch > 60 giây (hoặc `last_active_at` đang null), tiến hành cập nhật `last_active_at` thành thời điểm hiện tại và commit vào DB. Việc này giúp tránh ghi dữ liệu liên tục theo từng request.
- [x] Cập nhật endpoint `/api/admin/users` trong [admin.py](file:///d:/git/text-to-speed-internal/backend/routers/admin.py):
  * Trả về thêm: `last_login_at` (ISO format), `last_active_at` (ISO format).
  * Tính toán và trả về trường `is_online` kiểu boolean (true nếu `last_active_at` tồn tại và khoảng cách tới thời điểm hiện tại nhỏ hơn 5 phút).

## Files Likely Touched
- `backend/routers/auth.py` - Logic ghi nhận login và request tương tác của người dùng.
- `backend/routers/admin.py` - Cung cấp thông tin hoạt động của người dùng cho giao diện Admin.

## Acceptance Criteria
- [x] Khi người dùng đăng nhập, trường `last_login_at` được cập nhật chính xác thời gian thực tế.
- [x] Khi người dùng thao tác các API (ví dụ: tạo audio, xem thư viện), trường `last_active_at` được cập nhật định kỳ (không ghi nhận trùng lặp liên tục dưới 1 phút).
- [x] API `/api/admin/users` trả về đầy đủ `last_login_at`, `last_active_at`, và `is_online`.
