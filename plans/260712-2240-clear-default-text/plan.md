# Plan: Clear Default Text
Created: 2026-07-12T22:40:16+07:00
Status: In Progress

## Overview
Tính năng tự động xóa text mặc định ở màn hình CreateAudio nếu hệ thống phát hiện user đã từng sử dụng token (có history usage).

## Goals
- Giữ text mặc định cho user hoàn toàn mới để họ test ngay.
- Xóa text mặc định cho user cũ để họ không cần xóa tay mỗi khi dùng.

## Out of Scope
- Không thay đổi text ở các màn hình khác.
- Không thay đổi UI hiển thị báo lỗi/cảnh báo token.

## Users
- User cũ: Không bị khó chịu bởi text mặc định mỗi khi vào trang tạo âm thanh.
- User mới: Có mẫu text sẵn để test hệ thống.

## MVP Features
- Thêm `useEffect` trong `useCreateAudio.js`.
- Check điều kiện `billing?.usage?.chars_used_this_month > 0`.
- Clear state `text` nếu đang là chuỗi mặc định.

## Key Decisions
- Xử lý trực tiếp ở hook `useCreateAudio` thay vì giao diện `CreateAudio.jsx` để tập trung logic data.

## Risks / Open Questions
- Cần có biến cờ (`hasClearedDefault`) để chắc chắn logic clear text chỉ chạy một lần, tránh việc ghi đè lên text mà user vừa mới tự gõ.

## Phases
| Phase | Name | Status | Notes |
|---|---|---|---|
| 01 | Implementation | Pending | Chỉ sửa đổi file `useCreateAudio.js` |

## Next Step
`/code`
