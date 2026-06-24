# Plan: Storage & Audio Library Upgrade
Created: 2026-06-24 07:29
Status: 🟡 In Progress

## Overview
Nâng cấp tính năng lưu trữ file audio lên VPS/Cloud, sinh đường link stream trực tuyến để nghe online và tích hợp giao diện thư viện quản lý file (Audio Player). Tách biệt bộ dịch vụ lưu trữ (Storage Service) thành một service riêng hỗ trợ 2 nhà cung cấp (Local VPS và AWS R2/S3).

## Tech Stack
- Frontend: React + Vite (Vanilla CSS)
- Backend: Python FastAPI + Uvicorn
- Database: SQLite (SQLAlchemy ORM)
- Storage Provider: File System (Local VPS), boto3 (Cloudflare R2 / AWS S3)

## Phases

| Phase | Name | Status | Progress |
|-------|------|--------|----------|
| 01 | Setup Environment | ⬜ Pending | 0% |
| 02 | Database Schema & Configuration | ⬜ Pending | 0% |
| 03 | Backend Storage Service & Stream API | ⬜ Pending | 0% |
| 04 | Frontend UI - Audio Library Screen | ⬜ Pending | 0% |
| 05 | Integration & Testing | ⬜ Pending | 0% |

## Quick Commands
- Start Phase 1: `/code phase-01`
- Check progress: `/next`
- Save context: `/save-brain`
