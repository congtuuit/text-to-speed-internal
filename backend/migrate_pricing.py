"""
migrate_pricing.py
------------------
Run this once to add the pricing/subscription tables to an existing database.

    cd backend
    python migrate_pricing.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import engine, Base
import models  # ensures all models are registered with Base

print("Creating pricing tables (user_subscriptions, usage_logs) ...")
Base.metadata.create_all(bind=engine)
print("Done.")
