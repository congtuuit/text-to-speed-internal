# Phase 01: Database Migration
Status: Completed
Dependencies: None

## Objective
Thêm các cột `last_login_at` và `last_active_at` vào bảng `users` trong cơ sở dữ liệu SQLite hiện tại.

## Tasks
- [x] Cập nhật định nghĩa class `User` trong [models.py](file:///d:/git/text-to-speed-internal/backend/models.py) để bao gồm hai trường mới:
  * `last_login_at = Column(DateTime, nullable=True)`
  * `last_active_at = Column(DateTime, nullable=True)`
- [x] Tạo file script di cư cơ sở dữ liệu `backend/migrate_user_activity.py` để chạy lệnh `ALTER TABLE users ADD COLUMN...` nếu các cột này chưa tồn tại.
- [x] Chạy thử nghiệm script di cư này trên môi trường local và xác nhận cấu trúc bảng `users` đã được cập nhật thành công.

## Files Likely Touched
- `backend/models.py` - Định nghĩa model `User`.
- `backend/migrate_user_activity.py` [NEW] - Script migration cấu trúc cơ sở dữ liệu SQLite.

## Acceptance Criteria
- [x] Cơ sở dữ liệu SQLite `tts_batch.db` được cập nhật thêm hai cột `last_login_at` và `last_active_at` mà không bị mất mát hay ảnh hưởng tới dữ liệu cũ.
- [x] Không có lỗi runtime khi khởi chạy ứng dụng FastAPI sau khi cập nhật model.
