# Changelog

Tất cả các thay đổi quan trọng của dự án **Text to Speed Internal** sẽ được cập nhật tại đây.

---

## [2026-06-28]

### Changed
- Tối ưu hóa giao diện đăng nhập (Login UI) trên các thiết bị di động (responsive mobile):
  - Giảm padding của `.auth-page` và `.auth-card` khi chiều rộng màn hình <= 480px.
  - Sửa lỗi tràn viền (overflow) của nút Google Sign-In bằng cách tính toán độ rộng responsive động dựa trên kích thước thực tế của viewport và container.
- Cập nhật tài liệu kỹ thuật & ghi nhớ trạng thái session trong `.brain/session.json`.

## [2026-06-27]

### Added
- Thêm cơ chế tự động dọn dẹp các file audio cũ đã tạo quá 30 ngày (TTL 30 days) chạy ngầm (background service `library_cleaner` chạy mỗi 24 giờ).
- Thêm huy hiệu đếm ngược ngày hết hạn (countdown badge) cho các file âm thanh trên giao diện Library và Dashboard.

### Fixed
- Sửa lỗi đăng nhập Google trả về mã `422 Unprocessable Content` bằng cách cập nhật schema payload ở router backend khớp với trường `token` được gửi từ frontend.
- Khắc phục lỗi Nginx reverse proxy nhân đôi tiền tố đường dẫn `/api/api/auth/login` bằng cách tinh chỉnh tham số `proxy_pass` trong cấu hình máy chủ.

## [2026-06-24]

### Added
- Thêm file script tự động cài đặt hệ thống trên VPS Linux: [setup_vps.sh](file:///d:/git/text-to-speed-internal/setup_vps.sh).
- Thêm tài liệu hướng dẫn cấu hình triển khai dự án chi tiết trên VPS: [docs/vps_deployment_guide.md](file:///d:/git/text-to-speed-internal/docs/vps_deployment_guide.md).
- Thêm kế hoạch nâng cấp tính năng bộ lưu trữ & thư viện audio player: [plans/260624-0729-storage-library/plan.md](file:///d:/git/text-to-speed-internal/plans/260624-0729-storage-library/plan.md).
- Thêm đặc tả thiết kế kỹ thuật tính năng Storage & Audio Library: [docs/specs/storage_library_spec.md](file:///d:/git/text-to-speed-internal/docs/specs/storage_library_spec.md).

### Changed
- Cập nhật cấu hình dự án tĩnh trong [.brain/brain.json](file:///d:/git/text-to-speed-internal/.brain/brain.json) để theo dõi tính năng mới.
- Lưu trữ session làm việc hiện tại vào [.brain/session.json](file:///d:/git/text-to-speed-internal/.brain/session.json).
