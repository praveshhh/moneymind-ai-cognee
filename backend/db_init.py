import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import bcrypt
from datetime import datetime, timedelta
from backend.db_setup import init_db, SessionLocal, User, Account, Bill, Goal, Transaction

def seed_database():
    print("Initializing database tables...")
    init_db()
    
    db = SessionLocal()
    try:
        # 1. Create or fetch User
        demo_user = db.query(User).filter(User.username == "demo").first()
        if not demo_user:
            print("Seeding database with demo user...")
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
        else:
            print("Demo user already exists. Checking account configurations...")

        # 2. Check and Create Accounts
        checking = db.query(Account).filter(Account.user_id == demo_user.id, Account.name == "HDFC Checking").first()
        if not checking:
            checking = Account(
                user_id=demo_user.id,
                name="HDFC Checking",
                type="checking",
                balance=38000.0
            )
            db.add(checking)
            
        credit = db.query(Account).filter(Account.user_id == demo_user.id, Account.name == "ICICI Credit Card").first()
        if not credit:
            credit = Account(
                user_id=demo_user.id,
                name="ICICI Credit Card",
                type="credit",
                balance=4200.0
            )
            db.add(credit)

        kotak = db.query(Account).filter(Account.user_id == demo_user.id, Account.name == "Kotak 811").first()
        if not kotak:
            kotak = Account(
                user_id=demo_user.id,
                name="Kotak 811",
                type="savings",
                balance=273.10  # opening balance matching statement
            )
            db.add(kotak)

        sbi = db.query(Account).filter(Account.user_id == demo_user.id, Account.name == "SBI Savings").first()
        if not sbi:
            sbi = Account(
                user_id=demo_user.id,
                name="SBI Savings",
                type="savings",
                balance=12500.0
            )
            db.add(sbi)

        db.commit()
        if checking:
            db.refresh(checking)
        if credit:
            db.refresh(credit)
        if kotak:
            db.refresh(kotak)
        if sbi:
            db.refresh(sbi)

        # 3. Create Upcoming Bills (Commitments) if not exist
        today = datetime.utcnow().date()
        bill_exists = db.query(Bill).filter(Bill.user_id == demo_user.id).first()
        if not bill_exists:
            bills = [
                Bill(user_id=demo_user.id, name="Rent Payment", amount=15000.0, due_date=today + timedelta(days=3), is_recurring=True, status="Unpaid"),
                Bill(user_id=demo_user.id, name="Electricity Bill", amount=2500.0, due_date=today + timedelta(days=7), is_recurring=True, status="Unpaid"),
                Bill(user_id=demo_user.id, name="Netflix Subscription", amount=499.0, due_date=today + timedelta(days=10), is_recurring=True, status="Unpaid"),
                Bill(user_id=demo_user.id, name="Mutual Fund SIP", amount=5000.0, due_date=today + timedelta(days=15), is_recurring=True, status="Unpaid")
            ]
            db.add_all(bills)

        # 4. Create Goals if not exist
        goal_exists = db.query(Goal).filter(Goal.user_id == demo_user.id).first()
        if not goal_exists:
            goal = Goal(
                user_id=demo_user.id,
                name="Goa Trip",
                target_amount=20000.0,
                current_amount=5000.0,
                target_date=today + timedelta(days=90),
                status="Active"
            )
            db.add(goal)

        # 5. Create Historical Transactions if none exist
        tx_exists = db.query(Transaction).filter(Transaction.user_id == demo_user.id).first()
        if not tx_exists and checking:
            txs = [
                Transaction(
                    user_id=demo_user.id,
                    account_id=checking.id,
                    amount=-50000.0,
                    merchant="HDFC Payroll",
                    category="Salary",
                    date=today - timedelta(days=25),
                    type="credit",
                    sentiment="Happy",
                    note="Monthly Salary Credit"
                ),
                Transaction(
                    user_id=demo_user.id,
                    account_id=checking.id,
                    amount=700.0,
                    merchant="Swiggy Pizza",
                    category="Food",
                    date=today - timedelta(days=15),
                    type="debit",
                    sentiment="Happy",
                    note="Friday night reward"
                ),
                Transaction(
                    user_id=demo_user.id,
                    account_id=checking.id,
                    amount=8999.0,
                    merchant="Amazon Electronics",
                    category="Shopping",
                    date=today - timedelta(days=10),
                    type="debit",
                    sentiment="Regret",
                    note="Bought Bluetooth headphones. Regreted because they are uncomfortable and I already own a set."
                ),
                Transaction(
                    user_id=demo_user.id,
                    account_id=checking.id,
                    amount=1200.0,
                    merchant="Blinkit Grocery",
                    category="Utilities",
                    date=today - timedelta(days=5),
                    type="debit",
                    sentiment="Neutral",
                    note="Weekly groceries"
                )
            ]
            db.add_all(txs)
        
        db.commit()
        print("Database successfully verified and updated!")
        print("User details: demo / demo123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
