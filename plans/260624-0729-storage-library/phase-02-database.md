# Phase 02: Database Schema & Configuration Settings
Status: ⬜ Pending
Dependencies: Phase 01

## Objective
Thiết lập cơ sở dữ liệu để quản lý cấu hình Storage Provider (Nhà cung cấp lưu trữ) và lưu danh sách file trong thư viện âm thanh (Audio Library).

## Requirements
### Functional
- Cập nhật cấu hình lưu trữ vào cơ sở dữ liệu.
- Lưu trữ danh sách file audio đã sẵn sàng nghe online.

### Non-Functional
- Đảm bảo tính nhất quán dữ liệu (Data consistency).

## Implementation Steps
1. [ ] Cập nhật file `backend/models.py`:
   - Định nghĩa model `GeneratedAudio` để lưu danh sách file audio trong thư viện:
     ```python
     class GeneratedAudio(Base):
         __tablename__ = "generated_audios"
         id = Column(Integer, primary_key=True, index=True)
         file_name = Column(String, index=True)
         file_path = Column(String)  # Đường dẫn vật lý tại local
         storage_provider = Column(String, default="local") # local, r2
         audio_url = Column(String)  # URL truy xuất file (dùng để stream/download)
         created_at = Column(DateTime, default=datetime.utcnow)
     ```
2. [ ] Viết script migrate database bổ sung bảng mới (hoặc để SQLAlchemy tự động tạo bảng khi khởi động trong `backend/main.py`).

## Files to Create/Modify
- `backend/models.py` - Định nghĩa cấu trúc bảng mới `GeneratedAudio`.

## Test Criteria
- [ ] Bảng `generated_audios` được tạo tự động trong SQLite (`tts_batch.db`) khi khởi động ứng dụng.
- [ ] Có thể thực hiện câu lệnh query đọc/ghi vào bảng `GeneratedAudio` thông qua SQLAlchemy.

---
Next Phase: [Phase 03](file:///d:/git/text-to-speed-internal/plans/260624-0729-storage-library/phase-03-backend.md)
