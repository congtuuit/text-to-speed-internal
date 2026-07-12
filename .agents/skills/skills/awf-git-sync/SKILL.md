# SKILL: awf-git-sync
---
name: awf-git-sync
description: Tự động hóa quy trình Commit và Push code lên GitHub với thông điệp thông minh.
---

## 📖 Giới thiệu
Skill này giúp Antigravity Librarian thực hiện việc lưu trữ mã nguồn lên Git một cách nhanh chóng và chính xác, đảm bảo mọi thay đổi đều được ghi vết.

## 🚀 Cách sử dụng

Khi User yêu cầu "commit và push", hãy thực hiện các bước sau:

1. **Phân tích thay đổi:**
   - Sử dụng `git status` để xem các file bị thay đổi.
   - Nhận diện các tính năng mới hoặc lỗi đã sửa.

2. **Tạo thông điệp Commit (Smart Message):**
   - Tuân thủ chuẩn Conventional Commits (ví dụ: `feat:`, `fix:`, `docs:`, `refactor:`).
   - Ngôn ngữ: Tiếng Anh hoặc Tiếng Việt tùy theo preference của user.

3. **Thực thi lệnh:**
   ```powershell
   git add .
   git commit -m "[Thành phần]: [Mô tả ngắn]"
   git push
   ```

4. **Báo cáo:**
   - Liệt kê các file đã được đẩy lên.
   - Xác nhận trạng thái thành công.

## 💡 Lưu ý
- Luôn kiểm tra `git status` trước khi add để tránh add nhầm các file rác hoặc nhạy cảm (như `.env`).
- Nhắc nhở User cập nhật `.gitignore` nếu thấy có file `.env` chưa được chặn.
