
# -*- coding: utf-8 -*-
"""
Pricing plan definitions

STRATEGY (Self-hosted Omni TTS on Mac Mini M4 16GB)
--------------------------------------------------
Goals:
1. Dễ bán cho thị trường Việt Nam.
2. Không bị vài khách hàng nặng chiếm toàn bộ tài nguyên.
3. Có đủ biên lợi nhuận để scale thêm Mac Mini.
4. Chỉ mở API cho khách hàng thực sự có nhu cầu.

Pricing (VND/month)
-------------------
Free       :        0đ / 20K chars
Starter    :  149,000đ / 300K chars
Pro         :  449,000đ / 1M chars
Studio      : 1,290,000đ / 3M chars + API
Enterprise  : Negotiated
"""

PLANS = {
    "free": {
        "id": "free",
        "name": "Free",
        "name_vi": "Miễn phí",

        "price_usd": 0,
        "price_vnd": 0,

        "chars_limit": 20_000,
        "batch_files_limit": 3,
        "audio_storage_limit": 20,
        "concurrent_jobs": 1,

        "rate_limit_per_minute": 5,
        "max_chars_per_request": 2_000,
        "queue_priority": "low",
        "api_enabled": False,

        "features_en": [
            "20,000 characters / month",
            "Up to 3 files per batch",
            "20 audio files in library",
            "All Vietnamese voices",
            "Community support",
            "Batch DOCX conversion",
        ],
        "features_vi": [
            "20.000 ký tự / tháng",
            "Tối đa 3 tệp mỗi lô xử lý",
            "Lưu trữ 20 tệp âm thanh",
            "Đầy đủ giọng đọc tiếng Việt",
            "Hỗ trợ cộng đồng",
            "Chuyển đổi DOCX hàng loạt",
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

        "rate_limit_per_minute": 20,
        "max_chars_per_request": 5_000,
        "queue_priority": "normal",
        "api_enabled": False,

        "features_en": [
            "300,000 characters / month",
            "~497đ per 1,000 chars",
            "Up to 20 files per batch",
            "200 audio files in library",
            "⚡2 concurrent jobs",
            "Email support",
            "Batch DOCX conversion",
        ],
        "features_vi": [
            "300.000 ký tự / tháng",
            "~497đ / 1.000 ký tự",
            "Tối đa 20 tệp mỗi lô xử lý",
            "Lưu trữ 200 tệp âm thanh",
            "⚡2 tác vụ đồng thời",
            "Hỗ trợ qua email",
            "Chuyển đổi DOCX hàng loạt",
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

        "price_usd": 18,
        "price_vnd": 449_000,

        "chars_limit": 1_000_000,
        "batch_files_limit": 100,
        "audio_storage_limit": 1_000,
        "concurrent_jobs": 3,

        "rate_limit_per_minute": 60,
        "max_chars_per_request": 20_000,
        "queue_priority": "high",
        "api_enabled": False,

        "features_en": [
            "1,000,000 characters / month",
            "~449đ per 1,000 chars",
            "Up to 100 files per batch",
            "1,000 audio files in library",
            "⚡3 concurrent jobs",
            "Priority support",
            "Batch DOCX conversion",
        ],
        "features_vi": [
            "1.000.000 ký tự / tháng",
            "~449đ / 1.000 ký tự",
            "Tối đa 100 tệp mỗi lô xử lý",
            "Lưu trữ 1.000 tệp âm thanh",
            "⚡3 tác vụ đồng thời",
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

        "price_usd": None,
        "price_vnd": None,

        "chars_limit": 3_000_000,
        "batch_files_limit": 500,
        "audio_storage_limit": 5_000,
        "concurrent_jobs": 5,

        "rate_limit_per_minute": 180,
        "max_chars_per_request": 50_000,
        "queue_priority": "highest",
        "api_enabled": True,

        "features_en": [
            "3,000,000 characters / month",
            "~430đ per 1,000 chars",
            "Up to 500 files per batch",
            "5,000 audio files in library",
            "⚡5 concurrent jobs",
            "Priority support + SLA",
            "REST API access",
            "Custom voice seed library",
            "SLA + dedicated account manager",
        ],
        "features_vi": [
            "3.000.000 ký tự / tháng",
            "~430đ / 1.000 ký tự",
            "Tối đa 500 tệp mỗi lô xử lý",
            "Lưu trữ 5.000 tệp âm thanh",
            "⚡5 tác vụ đồng thời",
            "Hỗ trợ ưu tiên + SLA",
            "Truy cập REST API",
            "Thư viện giọng đọc tùy chỉnh",
            "SLA + quản lý khách hàng riêng",
        ],

        "highlight": False,
        "cta_en": "Upgrade to Studio",
        "cta_vi": "Nâng cấp Studio",
        "badge_en": "API Included",
        "badge_vi": "Bao gồm API",
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

        "rate_limit_per_minute": -1,
        "max_chars_per_request": -1,
        "queue_priority": "dedicated",
        "api_enabled": True,

        "features_en": [
            "Unlimited characters",
            "Unlimited batch jobs",
            "Unlimited audio storage",
            "Dedicated worker capacity",
            "On-premise / private cloud",
            "SLA + dedicated account manager",
            "Volume pricing negotiable",
        ],
        "features_vi": [
            "Không giới hạn ký tự",
            "Không giới hạn lô xử lý",
            "Không giới hạn lưu trữ âm thanh",
            "Hạ tầng xử lý riêng",
            "Triển khai tại chỗ hoặc đám mây riêng",
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

PLAN_ORDER = [
    "free",
    "starter",
    "pro",
    "studio",
    "enterprise",
]


def get_plan(plan_id: str) -> dict:
    return PLANS.get(plan_id, PLANS["free"])

