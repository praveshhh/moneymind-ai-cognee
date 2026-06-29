import sys
import bcrypt
from datetime import datetime, timedelta
from backend.db_setup import init_db, SessionLocal, User, Account, Bill, Goal, Transaction

def seed_database():
    print("Initializing database tables...")
    init_db()
    
    db = SessionLocal()
    try:
        # Check if demo user already exists
        demo_user = db.query(User).filter(User.username == "demo").first()
        if demo_user:
            print("Database already seeded with demo user.")
            return

        print("Seeding database with demo records...")
        
        # 1. Create User
        pwd_bytes = "demo123".encode('utf-8')
        salt = bcrypt.gensalt()
        hashed_pw = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
        user = User(
            username="demo",
            email="demo@moneymind.ai",
            hashed_password=hashed_pw,
            monthly_income=50000.0,
            savings_goal=15000.0
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. Create Accounts
        checking = Account(
            user_id=user.id,
            name="HDFC Checking",
            type="checking",
            balance=38000.0
        )
        credit = Account(
            user_id=user.id,
            name="ICICI Credit Card",
            type="credit",
            balance=4200.0
        )
        db.add(checking)
        db.add(credit)
        db.commit()
        db.refresh(checking)
        db.refresh(credit)

        # 3. Create Upcoming Bills (Commitments)
        today = datetime.utcnow().date()
        
        bills = [
            Bill(user_id=user.id, name="Rent Payment", amount=15000.0, due_date=today + timedelta(days=3), is_recurring=True, status="Unpaid"),
            Bill(user_id=user.id, name="Electricity Bill", amount=2500.0, due_date=today + timedelta(days=7), is_recurring=True, status="Unpaid"),
            Bill(user_id=user.id, name="Netflix Subscription", amount=499.0, due_date=today + timedelta(days=10), is_recurring=True, status="Unpaid"),
            Bill(user_id=user.id, name="Mutual Fund SIP", amount=5000.0, due_date=today + timedelta(days=15), is_recurring=True, status="Unpaid")
        ]
        db.add_all(bills)

        # 4. Create Goals
        goal = Goal(
            user_id=user.id,
            name="Goa Trip",
            target_amount=20000.0,
            current_amount=5000.0,
            target_date=today + timedelta(days=90),
            status="Active"
        )
        db.add(goal)

        # 5. Create Historical Transactions
        txs = [
            Transaction(
                user_id=user.id,
                account_id=checking.id,
                amount=-50000.0, # Negative = Credit/Income in standard banking imports
                merchant="HDFC Payroll",
                category="Salary",
                date=today - timedelta(days=25),
                type="credit",
                sentiment="Happy",
                note="Monthly Salary Credit"
            ),
            Transaction(
                user_id=user.id,
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
                user_id=user.id,
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
                user_id=user.id,
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
        
        print("Database successfully seeded!")
        print("User details: demo / demo123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {str(e)}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
