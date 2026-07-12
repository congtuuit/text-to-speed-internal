# Phase 01: Implementation
Status: Pending
Dependencies: plan.md

## Objective
Xóa text mặc định ở ô nhập liệu khi người dùng đã có token tiêu thụ.

## Tasks
- [x] Mở file `frontend/src/hooks/useCreateAudio.js`
- [x] Thêm state `hasClearedDefault` để kiểm soát lần xóa đầu tiên.
- [x] Thêm logic `useEffect` để kiểm tra `billing?.usage?.chars_used_this_month > 0`. Nếu thỏa mãn và `text` đang là đoạn mặc định, cập nhật `text` về rỗng (`""`) và bật cờ `hasClearedDefault`.

## Files Likely Touched
- `frontend/src/hooks/useCreateAudio.js` - Chứa state text và gọi useBilling.

## Acceptance Criteria
- [ ] User mới (chars_used = 0) vẫn thấy text mẫu mặc định.
- [ ] User cũ (chars_used > 0) vào trang sẽ thấy ô nhập text trống trơn.
- [ ] Logic không được ghi đè text nếu user vừa truy cập và tự gõ text mới trước khi billing load xong.

## Notes
- Kiểm tra chính xác string mặc định: `"Xin chào, đây là bản đọc thử tiếng Việt cho sản phẩm TTS Studio."`.
