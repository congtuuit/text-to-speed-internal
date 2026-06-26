from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import User, UserSubscription, UsageLog
import models
from routers.auth import _current_user_from_request
from pricing_config import PLANS, PLAN_ORDER, get_plan
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/billing", tags=["billing"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _get_or_create_subscription(user: User, db: Session) -> UserSubscription:
    """Return existing subscription or bootstrap a free-tier one."""
    sub = db.query(UserSubscription).filter(UserSubscription.user_id == user.id).first()
    if not sub:
        plan = get_plan("free")
        sub = UserSubscription(
            user_id=user.id,
            plan_id="free",
            status="active",
            chars_limit=plan["chars_limit"],
            batch_files_limit=plan["batch_files_limit"],
            audio_storage_limit=plan["audio_storage_limit"],
            concurrent_jobs=plan["concurrent_jobs"],
        )
        db.add(sub)
        db.commit()
        db.refresh(sub)
    return sub


def get_monthly_usage(user_id: int, db: Session) -> int:
    """Sum characters used by this user in the current calendar month."""
    now = datetime.utcnow()
    first_of_month = datetime(now.year, now.month, 1)
    result = db.query(func.sum(UsageLog.chars_used)).filter(
        UsageLog.user_id == user_id,
        UsageLog.created_at >= first_of_month,
    ).scalar()
    return result or 0


def record_usage(user_id: int, chars: int, action: str, db: Session):
    """Persist a usage event."""
    log = UsageLog(user_id=user_id, chars_used=chars, action=action)
    db.add(log)
    db.commit()


def check_quota(user: User, chars_requested: int, db: Session):
    """Raise 402 if the user would exceed their monthly character quota."""
    sub = _get_or_create_subscription(user, db)
    if sub.chars_limit == -1:
        return  # unlimited
    used = get_monthly_usage(user.id, db)
    if used + chars_requested > sub.chars_limit:
        raise HTTPException(
            status_code=402,
            detail=f"Monthly character quota exceeded ({used}/{sub.chars_limit}). Please upgrade your plan.",
        )


def check_batch_quota(user: User, file_count: int, db: Session):
    """Raise 402 if the user's batch job would exceed their per-job file limit."""
    sub = _get_or_create_subscription(user, db)
    if sub.batch_files_limit == -1:
        return
    if file_count > sub.batch_files_limit:
        raise HTTPException(
            status_code=402,
            detail=f"Your plan allows at most {sub.batch_files_limit} files per batch job. Please upgrade.",
        )


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/plans")
def list_plans():
    """Public: return all pricing plans in display order."""
    return {"plans": [PLANS[p] for p in PLAN_ORDER]}


@router.get("/me")
def get_my_billing(request: Request, db: Session = Depends(get_db)):
    """Authenticated: return current user's subscription + usage."""
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sub = _get_or_create_subscription(user, db)
    used = get_monthly_usage(user.id, db)
    plan_meta = get_plan(sub.plan_id)

    return {
        "subscription": {
            "plan_id": sub.plan_id,
            "plan_name": plan_meta["name"],
            "status": sub.status,
            "chars_limit": sub.chars_limit,
            "batch_files_limit": sub.batch_files_limit,
            "audio_storage_limit": sub.audio_storage_limit,
            "concurrent_jobs": sub.concurrent_jobs,
            "started_at": sub.started_at.isoformat() if sub.started_at else None,
            "expires_at": sub.expires_at.isoformat() if sub.expires_at else None,
        },
        "usage": {
            "chars_used_this_month": used,
            "chars_remaining": max(0, sub.chars_limit - used) if sub.chars_limit != -1 else -1,
        },
    }


class UpgradeRequest(BaseModel):
    plan_id: str
    payment_ref: Optional[str] = None   # set by payment gateway callback


@router.post("/upgrade")
def upgrade_plan(req: UpgradeRequest, request: Request, db: Session = Depends(get_db)):
    """
    Upgrade/downgrade a user's plan.
    In production, this endpoint should only be called after a successful
    payment-gateway webhook.  For now it is open so the admin can manually
    assign plans (or you can gate it behind an admin check).
    """
    user = _current_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if req.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {req.plan_id}")

    plan = get_plan(req.plan_id)
    sub = _get_or_create_subscription(user, db)

    sub.plan_id = req.plan_id
    sub.status = "active"
    sub.chars_limit = plan["chars_limit"]
    sub.batch_files_limit = plan["batch_files_limit"]
    sub.audio_storage_limit = plan["audio_storage_limit"]
    sub.concurrent_jobs = plan["concurrent_jobs"]
    sub.started_at = datetime.utcnow()
    sub.expires_at = None
    if req.payment_ref:
        sub.payment_ref = req.payment_ref

    db.commit()
    db.refresh(sub)

    return {"message": f"Plan updated to {req.plan_id}", "plan": plan}


# ── Admin: assign plan to any user ───────────────────────────────────────────

class AdminAssignPlanRequest(BaseModel):
    user_id: int
    plan_id: str
    payment_ref: Optional[str] = None


@router.post("/admin/assign")
def admin_assign_plan(req: AdminAssignPlanRequest, request: Request, db: Session = Depends(get_db)):
    """Admin only: manually assign a plan to a user."""
    caller = _current_user_from_request(request, db)
    if not caller or caller.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    target_user = db.query(User).filter(User.id == req.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if req.plan_id not in PLANS:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {req.plan_id}")

    plan = get_plan(req.plan_id)
    sub = _get_or_create_subscription(target_user, db)

    sub.plan_id = req.plan_id
    sub.status = "active"
    sub.chars_limit = plan["chars_limit"]
    sub.batch_files_limit = plan["batch_files_limit"]
    sub.audio_storage_limit = plan["audio_storage_limit"]
    sub.concurrent_jobs = plan["concurrent_jobs"]
    sub.started_at = datetime.utcnow()
    sub.expires_at = None
    if req.payment_ref:
        sub.payment_ref = req.payment_ref

    db.commit()
    return {"message": f"User {req.user_id} assigned to plan {req.plan_id}"}


@router.get("/admin/users")
def admin_list_user_subscriptions(request: Request, db: Session = Depends(get_db)):
    """Admin only: list all users with their subscription info."""
    caller = _current_user_from_request(request, db)
    if not caller or caller.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    users = db.query(User).all()
    result = []
    for u in users:
        sub = _get_or_create_subscription(u, db)
        used = get_monthly_usage(u.id, db)
        result.append({
            "user_id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "plan_id": sub.plan_id,
            "status": sub.status,
            "chars_used": used,
            "chars_limit": sub.chars_limit,
        })
    return {"users": result}
