# -*- coding: utf-8 -*-
"""
Pricing plan definitions -- edit this file to change prices and limits.

STRATEGY (Self-hosted Omni TTS on Mac Mini M4 16GB)
----------------------------------------------------
Inference cost ~ zero (hardware owned). Costs: electricity, bandwidth, support.

Competitor benchmarks:
  FPT AI     : 10,000d / 1,000 chars  (10d / char)
  ElevenLabs : 10K chars free/month, paid ~7,500d / 1,000 chars
  PlayHT     : 450K-1,000Kd/month for 50K-600K chars
  Google TTS : 4 USD / 1M chars (WaveNet 16 USD / 1M)

Our advantage: near-zero inference cost -> more chars at lower price than FPT.
Mac Mini M4 constraint: ~1-3 concurrent requests; scale by adding hardware.

Pricing tiers (VND, monthly):
  Free    :   50,000 chars   -- 5x ElevenLabs free, strong conversion hook
  Starter :  300,000 chars   -- 149,000d  ( ~500d/1K  -- 50 pct cheaper than FPT )
  Pro     : 1,000,000 chars  -- 349,000d  ( ~350d/1K  -- audiobook / podcast )
  Studio  : 3,000,000 chars  -- 799,000d  ( ~267d/1K  -- publisher / agency )
  Enterprise: unlimited      -- negotiated             -- large org / on-premise
"""
PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "name_vi": "Miễn phí",
        "price_usd": 0,
        "price_vnd": 0,
        "chars_limit": 50_000,
        "batch_files_limit": 3,
        "audio_storage_limit": 30,
        "concurrent_jobs": 1,
        "features_en": [
            "50,000 characters / month",
            "Up to 3 files per batch job",
            "30 audio files in library",
            "All Vietnamese voices",
            "Community support",
        ],
        "features_vi": [
            "50.000 ký tự / tháng",
            "Tối đa 3 tệp mỗi lô xử lý",
            "Lưu trữ 30 tệp âm thanh",
            "Đầy đủ giọng đọc tiếng Việt",
            "Hỗ trợ cộng đồng",
        ],
        "highlight": False,
        "cta_en": "Get started free",
        "cta_vi": "Dùng miễn phí",
        "badge_en": None,
        "badge_vi": None,
    },
    "starter": {
        "id": "starter",
        "name": "Starter",
        "name_vi": "Starter",
        "price_usd": 6,
        "price_vnd": 149_000,
        "chars_limit": 300_000,
        "batch_files_limit": 20,
        "audio_storage_limit": 200,
        "concurrent_jobs": 2,
        "features_en": [
            "300,000 characters / month",
            "~500đ per 1,000 chars (50% cheaper than FPT)",
            "Up to 20 files per batch job",
            "200 audio files in library",
            "2 concurrent jobs",
            "Email support",
        ],
        "features_vi": [
            "300.000 ký tự / tháng",
            "~500đ / 1.000 ký tự (rẻ hơn 50% so với FPT AI)",
            "Tối đa 20 tệp mỗi lô xử lý",
            "Lưu trữ 200 tệp âm thanh",
            "2 tác vụ đồng thời",
            "Hỗ trợ qua email",
        ],
        "highlight": False,
        "cta_en": "Upgrade to Starter",
        "cta_vi": "Nâng cấp Starter",
        "badge_en": None,
        "badge_vi": None,
    },
    "pro": {
        "id": "pro",
        "name": "Pro",
        "name_vi": "Pro",
        "price_usd": 14,
        "price_vnd": 349_000,
        "chars_limit": 1_000_000,
        "batch_files_limit": 100,
        "audio_storage_limit": 1000,
        "concurrent_jobs": 3,
        "features_en": [
            "1,000,000 characters / month",
            "~350đ per 1,000 chars",
            "Up to 100 files per batch job",
            "1,000 audio files in library",
            "3 concurrent jobs",
            "Priority support",
            "Batch DOCX conversion",
        ],
        "features_vi": [
            "1.000.000 ký tự / tháng",
            "~350đ / 1.000 ký tự",
            "Tối đa 100 tệp mỗi lô xử lý",
            "Lưu trữ 1.000 tệp âm thanh",
            "3 tác vụ đồng thời",
            "Hỗ trợ ưu tiên",
            "Chuyển đổi DOCX hàng loạt",
        ],
        "highlight": True,
        "cta_en": "Upgrade to Pro",
        "cta_vi": "Nâng cấp Pro",
        "badge_en": "Most Popular",
        "badge_vi": "Phổ biến nhất",
    },
    "studio": {
        "id": "studio",
        "name": "Studio",
        "name_vi": "Studio",
        "price_usd": 32,
        "price_vnd": 799_000,
        "chars_limit": 3_000_000,
        "batch_files_limit": 500,
        "audio_storage_limit": 5000,
        "concurrent_jobs": 5,
        "features_en": [
            "3,000,000 characters / month",
            "~267đ per 1,000 chars (best rate)",
            "Up to 500 files per batch job",
            "5,000 audio files in library",
            "5 concurrent jobs",
            "Priority support + SLA",
            "API access",
            "Custom voice seed library",
        ],
        "features_vi": [
            "3.000.000 ký tự / tháng",
            "~267đ / 1.000 ký tự (tiết kiệm nhất)",
            "Tối đa 500 tệp mỗi lô xử lý",
            "Lưu trữ 5.000 tệp âm thanh",
            "5 tác vụ đồng thời",
            "Hỗ trợ ưu tiên + SLA",
            "Truy cập API",
            "Thư viện giọng đọc tùy chỉnh",
        ],
        "highlight": False,
        "cta_en": "Upgrade to Studio",
        "cta_vi": "Nâng cấp Studio",
        "badge_en": "Best Value",
        "badge_vi": "Tiết kiệm nhất",
    },
    "enterprise": {
        "id": "enterprise",
        "name": "Enterprise",
        "name_vi": "Doanh nghiệp",
        "price_usd": None,
        "price_vnd": None,
        "chars_limit": -1,
        "batch_files_limit": -1,
        "audio_storage_limit": -1,
        "concurrent_jobs": -1,
        "features_en": [
            "Unlimited characters",
            "Unlimited batch jobs",
            "Unlimited audio storage",
            "Dedicated worker capacity",
            "On-premise / private cloud",
            "Custom voice model tuning",
            "SLA + dedicated account manager",
            "Volume pricing negotiable",
        ],
        "features_vi": [
            "Không giới hạn ký tự",
            "Không giới hạn lô xử lý",
            "Không giới hạn lưu trữ âm thanh",
            "Hạ tầng xử lý riêng",
            "Triển khai tại chỗ hoặc đám mây riêng",
            "Tinh chỉnh mô hình giọng đọc",
            "SLA + quản lý khách hàng riêng",
            "Giá theo sản lượng, có thể thương lượng",
        ],
        "highlight": False,
        "cta_en": "Contact Sales",
        "cta_vi": "Liên hệ tư vấn",
        "badge_en": None,
        "badge_vi": None,
    },
}

#PLAN_ORDER = ["free", "starter", "studio", "pro", "enterprise"]
PLAN_ORDER = ["free", "starter", "enterprise"]

def get_plan(plan_id: str) -> dict:
    return PLANS.get(plan_id, PLANS["free"])
