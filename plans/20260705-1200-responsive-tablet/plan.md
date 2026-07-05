# Plan: Tablet/iPad Responsive Layouts
Created: 2026-07-05
Status: In Progress

## Overview
Cập nhật và tối ưu hóa giao diện ứng dụng để hỗ trợ tốt trên các thiết bị màn hình cỡ trung (Tablet/iPad, kích thước ~768px đến 1024px). Dự án hiện đang sử dụng CSS thuần trong frontend/src/index.css với một số breakpoint có sẵn nhưng chưa bao phủ hết các trang và thành phần.

## Goals
- Đảm bảo tất cả các trang hiển thị đẹp, không bị vỡ layout trên Tablet/iPad.
- Tối ưu hóa Sidebar (thu gọn hoặc điều chỉnh).
- Cải thiện Grid layouts (điều chỉnh cột).
- Điều chỉnh font chữ, padding, margin cho phù hợp màn hình cảm ứng.

## Out of Scope
- Chuyển đổi framework CSS (không dùng Tailwind/Bootstrap, giữ nguyên CSS thuần).
- Thiết kế lại hoàn toàn UI.

## Users
- Người dùng: Trải nghiệm mượt mà, dễ thao tác trên iPad/Tablet.

## MVP Features
- Tối ưu Global Layout (Sidebar, Layout chính).
- Tối ưu Grid Layouts (Voices, Audio Library).
- Tối ưu Form/Input (Create Audio, Batch).
- Tối ưu Player.

## Key Decisions
- Sử dụng CSS Media Queries: @media (max-width: 1024px) và @media (max-width: 768px).

## Phases
| Phase | Name | Status | Notes |
|---|---|---|---|
| 01 | Audit & Global Layout | Pending | Cấu trúc Container và Sidebar |
| 02 | Core Pages | Pending | Create Audio, Voices, Library |
| 03 | Admin & Batch Pages | Pending | Data Tables, Queue Monitor |
| 04 | Public Pages | Pending | Landing, Pricing, Auth |
| 05 | Testing | Pending | Kiểm tra lại toàn bộ |

## Next Step
Dùng lệnh /code để triển khai Phase 01.
