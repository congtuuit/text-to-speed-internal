"""
assign_plan.py
------------------
Script kích hoạt hoặc cập nhật gói dịch vụ cho người dùng qua email.
Chạy từ terminal của backend:
    python backend/assign_plan.py --email [user@example.com] --plan [free|starter|pro|studio|enterprise]
"""
import os
import sys
import argparse
from datetime import datetime

# Set CWD to backend to allow imports
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from database import SessionLocal
import models
from pricing_config import PLANS

def assign_plan(email: str, plan_id: str):
    email = email.strip().lower()
    plan_id = plan_id.strip().lower()

    if plan_id not in PLANS:
        print(f"❌ Lỗi: Gói '{plan_id}' không tồn tại. Các gói khả dụng: {list(PLANS.keys())}")
        return

    plan = PLANS[plan_id]
    db = SessionLocal()
    try:
        # Tìm user qua email
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            print(f"❌ Lỗi: Không tìm thấy người dùng có email: '{email}'")
            return

        # Tìm hoặc tạo mới subscription
        sub = db.query(models.UserSubscription).filter(models.UserSubscription.user_id == user.id).first()
        if not sub:
            sub = models.UserSubscription(user_id=user.id)
            db.add(sub)
            print(f"➕ Tạo mới bản ghi Subscription cho User ID {user.id} ({user.email})")

        # Cập nhật thông số gói
        sub.plan_id = plan_id
        sub.status = "active"
        sub.chars_limit = plan["chars_limit"]
        sub.batch_files_limit = plan["batch_files_limit"]
        sub.audio_storage_limit = plan["audio_storage_limit"]
        sub.concurrent_jobs = plan["concurrent_jobs"]
        sub.started_at = datetime.utcnow()
        sub.expires_at = None
        
        db.commit()
        print(f"✅ Thành công: Đã kích hoạt gói '{plan['name_vi'] or plan['name']}' cho {user.email}!")
        print(f"   - Giới hạn ký tự: {sub.chars_limit if sub.chars_limit != -1 else 'Không giới hạn'}")
        print(f"   - Số Job đồng thời: {sub.concurrent_jobs if sub.concurrent_jobs != -1 else 'Không giới hạn'}")
        print(f"   - Batch tối đa: {sub.batch_files_limit if sub.batch_files_limit != -1 else 'Không giới hạn'} tệp")
    except Exception as e:
        db.rollback()
        print(f"❌ Đã xảy ra lỗi khi cập nhật gói: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kích hoạt gói dịch vụ cho người dùng qua email")
    parser.add_argument("--email", required=True, help="Email của người dùng cần kích hoạt")
    parser.add_argument("--plan", required=True, choices=list(PLANS.keys()), help="ID của gói dịch vụ")
    
    args = parser.parse_args()
    assign_plan(args.email, args.plan)
