# API Documentation

Ngày cập nhật: 2026-06-25
Base URL: /api

---

## 🔐 Authentication
- **POST /api/auth/register**: Đăng ký
- **POST /api/auth/login**: Đăng nhập
- **GET /api/auth/me**: Lấy thông tin user hiện tại

## 🎙️ TTS (Giọng nói)
- **POST /api/tts/chunk**: Gửi đoạn text (< 150 ký tự) để sinh file wav tạm thời
- **POST /api/tts/merge**: Gộp các file wav thành file hoàn chỉnh theo session_id
- **POST /api/test-voice**: Test giọng đơn giản (không chunk)
- **GET /api/models**: Lấy danh sách AI models
- **GET /api/voices**: Lấy danh sách giọng đọc

## 📂 Jobs & Batch
- **POST /api/scan**: Scan thư mục
- **POST /api/jobs**: Tạo job chuyển đổi hàng loạt
- **GET /api/jobs/{job_id}/tasks**: Lấy danh sách file trong job

## 🗃️ Library & Saved Voices
- **GET /api/library**: Lấy lịch sử audio đã tạo
- **GET /api/saved-voices**: Lấy danh sách cấu hình giọng lưu sẵn
