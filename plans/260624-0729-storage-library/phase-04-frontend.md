# Phase 04: Frontend UI - Audio Library Screen
Status: ⬜ Pending
Dependencies: Phase 03

## Objective
Xây dựng giao diện màn hình "Thư Viện Audio" trên Frontend để người dùng có thể nghe thử, tìm kiếm và quản lý các file audio đã tạo.

## Requirements
### Functional
- Giao diện tab mới hoặc panel mới: "Thư Viện Của Bạn" (Audio Library).
- Hiển thị danh sách file kèm thông tin: Tên file, ngày tạo, kích thước.
- Tích hợp HTML5 Audio Player (phát nhạc online).
- Nút "Copy Link" sao chép nhanh link stream.
- Nút "Tải Về" và "Xóa File" (dùng SweetAlert2 để xác nhận trước khi xóa).
- Ô tìm kiếm lọc danh sách file theo tên.

### Non-Functional
- Giao diện đồng bộ với phong cách Vanilla CSS hiện tại, sử dụng micro-animations cho các nút bấm.

## Implementation Steps
1. [ ] Cập nhật file `frontend/src/App.jsx`:
   - Thêm nút chuyển đổi tab hoặc mở Panel "Thư Viện" trên Sidebar hoặc Main Content.
   - Viết component `AudioLibrary` hiển thị danh sách và quản lý trạng thái player.
   - Thêm logic call API lấy dữ liệu (`GET /api/library`) và xóa dữ liệu (`DELETE /api/library/{id}`).
2. [ ] Sửa file CSS `frontend/src/index.css` để thiết kế giao diện Audio Player và danh sách file mượt mà.

## Files to Create/Modify
- `frontend/src/App.jsx` - Tích hợp giao diện thư viện.
- `frontend/src/index.css` - CSS cho Audio Library & Player.

## Test Criteria
- [ ] Màn hình Thư Viện hiển thị đúng danh sách file lấy từ Backend.
- [ ] Bấm nút "Nghe thử" hiển thị trình phát nhạc và phát đúng âm thanh của file.
- [ ] Bấm nút "Copy Link" hiện thông báo thành công và lưu đúng link vào clipboard.

---
Next Phase: [Phase 05](file:///d:/git/text-to-speed-internal/plans/260624-0729-storage-library/phase-05-integration.md)
