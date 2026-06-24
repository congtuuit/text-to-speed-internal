# Phase 03: Backend Storage Service & Stream API
Status: ⬜ Pending
Dependencies: Phase 02

## Objective
Viết code cho Storage Service riêng biệt, tích hợp API stream âm thanh và tự động đẩy file lên R2/S3 (hoặc lưu local) sau khi tạo xong.

## Requirements
### Functional
- Tạo class trừu tượng `StorageProvider` định nghĩa các hàm: `save()`, `get_url()`, `delete()`.
- Implement `LocalStorageProvider` (lưu file ở VPS) và `R2AwsStorageProvider` (lưu file ở AWS R2/S3).
- Cổng API `GET /api/audio/{file_name}` hỗ trợ HTTP Range Requests để tua âm thanh trên trình duyệt.
- API `GET /api/library` để lấy danh sách file.
- API `DELETE /api/library/{id}` để xóa file ở cả DB và storage vật lý.
- Tự động trigger đẩy file lên storage và lưu vào DB khi một task/job hoàn thành.

### Non-Functional
- Cơ chế stream có khả năng chống nghẽn và phản hồi nhanh.

## Implementation Steps
1. [ ] Tạo file `backend/services/storage_service.py`:
   - Định nghĩa `StorageProvider`, `LocalStorageProvider`, `R2AwsStorageProvider`.
   - Viết logic sinh URL tương ứng cho từng provider.
2. [ ] Sửa file `backend/main.py`:
   - Thêm endpoint `GET /api/audio/{file_name}` phục vụ stream file local.
   - Thêm endpoints: `GET /api/library`, `DELETE /api/library/{id}`.
3. [ ] Cập nhật `backend/services/queue_manager.py`:
   - Sau khi task hoặc job hoàn thành (Done), gọi `StorageService.save()` để xử lý file và lưu thông tin vào bảng `GeneratedAudio` trong database.

## Files to Create/Modify
- `backend/services/storage_service.py` - [NEW] Core Storage logic.
- `backend/main.py` - Thêm API endpoints cho audio streaming & thư viện.
- `backend/services/queue_manager.py` - Kết nối sự kiện hoàn thành task với Storage Service.

## Test Criteria
- [ ] Truy cập `http://localhost:8000/api/audio/test.wav` nghe được và tua được âm thanh.
- [ ] Khi chạy job thành công, thông tin file tự động xuất hiện trong bảng `generated_audios`.

---
Next Phase: [Phase 04](file:///d:/git/text-to-speed-internal/plans/260624-0729-storage-library/phase-04-frontend.md)
