# Plan: Batch DOCX Processing
Created: 2026-06-11 22:16
Status: 🟡 In Progress

## Overview
Cho phép chọn nguyên một thư mục (Folder) chứa nhiều file Word (.docx), hệ thống sẽ tự động quét, cắt nhỏ tất cả các file này và bỏ vào hàng đợi. UI sẽ theo dõi tiến độ xử lý của TỪNG file DOCX (hiển thị % hoàn thành, số txt đang chạy / tổng số) để người dùng dễ quan sát.

## Tech Stack
- Frontend: React (Vite)
- Backend: FastAPI, Python-docx
- Database: SQLite (SQLAlchemy)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | API Updates (Backend) | ✅ Complete | 100% |
| 02 | UI Updates (Frontend) | ✅ Complete | 100% |
| 03 | Integration & Testing | ✅ Complete | 100% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
