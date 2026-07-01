import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import bcrypt
from datetime import datetime
from backend.db_setup import init_db, SessionLocal, User, Account, Bill, Goal, Transaction

def seed_database():
    print("Initializing database tables...")
    init_db()
    
    db = SessionLocal()
    try:
        # 1. Wipe all legacy simulated records to ensure a completely real state
        print("Clearing all legacy simulated data...")
        db.query(Transaction).delete()
        db.query(Bill).delete()
        db.query(Goal).delete()
        db.query(Account).delete()
        db.query(User).delete()
        db.commit()
        
        # 2. Seed the demo user
        print("Creating demo user...")
        pwd_bytes = "demo123".encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
        demo_user = User(
            username="demo",
            email="demo@moneymind.ai",
            hashed_password=hashed_pw,
            monthly_income=50000.0,
            savings_goal=15000.0
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)

        # 3. No default accounts - wait for user to upload statement
        print("Empty state initialized. Waiting for user to upload their first statement to auto-detect bank.")
        
        print("Database successfully seeded with clean, real account structures!")
        print("User details: demo / demo123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
