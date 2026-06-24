# Phase 01: Project & Environment Setup
Status: ⬜ Pending
Dependencies: None

## Objective
Chuẩn bị thư viện cần thiết, thiết lập cấu hình biến môi trường cho cả Backend và Frontend để hỗ trợ tích hợp AWS R2 / S3.

## Requirements
### Functional
- Cài đặt thư viện `boto3` cho Backend FastAPI.
- Thêm biến môi trường lưu trữ vào file cấu hình.

### Non-Functional
- Đảm bảo an toàn bảo mật cho credentials của AWS R2 / S3.

## Implementation Steps
1. [ ] Cập nhật file `backend/requirements.txt`: Thêm `boto3` để kết nối AWS R2/S3.
2. [ ] Chạy cài đặt dependencies trong môi trường ảo của backend:
   ```bash
   cd backend
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. [ ] Cấu hình biến môi trường trong `backend/.env`:
   ```env
   # Chọn provider: local hoặc r2
   STORAGE_PROVIDER=local
   
   # Cấu hình R2/S3
   R2_ACCESS_KEY_ID=your_access_key
   R2_SECRET_ACCESS_KEY=your_secret_key
   R2_ENDPOINT_URL=https://<account_id>.r2.cloudflarestorage.com
   R2_BUCKET_NAME=your_bucket_name
   ```

## Files to Create/Modify
- `backend/requirements.txt` - Thêm `boto3`
- `backend/.env` - Thêm cấu hình storage

## Test Criteria
- [ ] Chạy backend không gặp lỗi import `boto3`.
- [ ] Backend load thành công các biến môi trường cấu hình Storage mới.

---
Next Phase: [Phase 02](file:///d:/git/text-to-speed-internal/plans/260624-0729-storage-library/phase-02-database.md)
