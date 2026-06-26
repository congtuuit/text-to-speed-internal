# Pricing Plan — Implementation Plan

## Overview
This document describes the full pricing & subscription system added to TTS Studio for production readiness.

---

## Architecture

### Backend (ackend/)

| File | Purpose |
|------|---------|
| pricing_config.py | Single source of truth for plan definitions (limits, prices, features) |
| models.py | Two new SQLAlchemy models: UserSubscription, UsageLog |
| outers/billing.py | REST API for plans, usage, upgrade, admin assignment |
| migrate_pricing.py | One-time migration: python migrate_pricing.py |

### Frontend (rontend/src/)

| File | Purpose |
|------|---------|
| pages/PricingPlans.jsx | Full pricing page with plan cards, usage bar |
| pages/Profile.jsx | Updated to show real plan/usage from API |
| pages/Dashboard.jsx | Updated to show real chars used/remaining |
| hooks/useBilling.js | Reusable hook to fetch /api/billing/me |
| components/Sidebar.jsx | Added pricing nav item |
| App.jsx | Added /pricing route, passed uthToken to Dashboard/Profile |
| index.css | Pricing card styles + progress bar styles |
| locales/en.json, locales/vi.json | Added pricing.* and 
av.pricing keys |

---

## Plans

| Plan | Price (USD) | Price (VND) | Chars/mo | Batch files | Stored audios | Concurrent jobs |
|------|-------------|-------------|----------|-------------|---------------|-----------------|
| Free |  | 0đ | 10,000 | 5 | 20 | 1 |
| Starter |  | 199,000đ | 100,000 | 50 | 200 | 2 |
| Pro |  | 599,000đ | 500,000 | 500 | 2,000 | 5 |
| Enterprise | Contact | Contact | Unlimited | Unlimited | Unlimited | 20 |

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/billing/plans | Public | List all plans |
| GET | /api/billing/me | User | Current user's subscription + usage |
| POST | /api/billing/upgrade | User | Change plan (needs payment ref in prod) |
| POST | /api/billing/admin/assign | Admin | Manually assign plan to any user |
| GET | /api/billing/admin/users | Admin | All users with plan/usage info |

---

## Quota Enforcement Helpers

illing.py exports two functions for use in TTS/batch routers:

`python
from routers.billing import check_quota, check_batch_quota, record_usage

# Before generating audio:
check_quota(user, len(text), db)       # raises HTTP 402 if over limit
record_usage(user.id, len(text), "generate", db)

# Before starting a batch job:
check_batch_quota(user, file_count, db)  # raises HTTP 402 if over limit
`

Call these inside outers/tts.py and outers/jobs.py once you are ready to enforce limits.

---

## Payment Gateway Integration (TODO for Production)

1. Choose a provider: **Stripe** (global), **PayOS** (Vietnam), or **MoMo**.
2. Create a checkout session server-side, redirect user to payment page.
3. On successful payment webhook → call POST /api/billing/upgrade with plan_id + payment_ref.
4. The billing router stores payment_ref in UserSubscription.payment_ref for audit.

---

## Migration

`ash
cd backend
python migrate_pricing.py
`

This is safe to run on an existing database — it only adds new tables.
