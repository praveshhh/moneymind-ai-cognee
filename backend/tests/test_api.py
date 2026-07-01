import io
import os
import sys
import unittest
from fastapi.testclient import TestClient

# Ensure backend root is in PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import FastAPI application
from backend.main import app
from backend.db_setup import SessionLocal, User, Account

class TestMoneyMindAPI(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        
        # Ensure we have a clean DB state for user demo
        db = SessionLocal()
        try:
            demo = db.query(User).filter(User.username == "demo").first()
            if not demo:
                # Setup dummy demo user
                import bcrypt
                pwd_bytes = "demo123".encode('utf-8')
                salt = bcrypt.gensalt()
                hashed = bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
                user = User(
                    username="demo",
                    email="demo@moneymind.ai",
                    hashed_password=hashed,
                    monthly_income=50000.0,
                    savings_goal=10000.0
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                acc = Account(
                    user_id=user.id,
                    name="Checking Account",
                    type="checking",
                    balance=38000.0
                )
                db.add(acc)
                db.commit()
        finally:
            db.close()

    def test_read_root(self):
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        self.assertIn("Welcome to MoneyMind AI", res.json()["message"])

    def test_login_and_auth(self):
        # 1. Login
        login_res = self.client.post("/api/auth/login", data={
            "username": "demo",
            "password": "demo123"
        })
        self.assertEqual(login_res.status_code, 200)
        token_data = login_res.json()
        self.assertIn("access_token", token_data)
        token = token_data["access_token"]

        # 2. Get profile
        me_res = self.client.get("/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        self.assertEqual(me_res.status_code, 200)
        self.assertEqual(me_res.json()["username"], "demo")

    def test_get_transactions_unauthorized(self):
        res = self.client.get("/api/transactions")
        self.assertEqual(res.status_code, 401)

    def test_chat_endpoint_mock_response(self):
        # Login to get token
        login_res = self.client.post("/api/auth/login", data={
            "username": "demo",
            "password": "demo123"
        })
        token = login_res.json()["access_token"]

        # Chat
        chat_res = self.client.post("/api/chat", json={
            "message": "Can I buy shoes?"
        }, headers={
            "Authorization": f"Bearer {token}"
        })
        # Should return a valid dictionary, even if LLM provider key is empty (graceful fallback)
        self.assertEqual(chat_res.status_code, 200)
        data = chat_res.json()
        self.assertIn("decision", data)
        self.assertIn("reasons", data)
        self.assertIn("response_text", data)
        self.assertIn("thinking_path", data)
        self.assertIsInstance(data["thinking_path"].get("recalled_memories", []), list)

    def test_import_csv_endpoint(self):
        login_res = self.client.post("/api/auth/login", data={
            "username": "demo",
            "password": "demo123"
        })
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["access_token"]

        db = SessionLocal()
        account = db.query(Account).first()
        db.close()
        self.assertIsNotNone(account)

        csv_content = (
            "date,merchant,category,amount,sentiment,note\n"
            "2026-06-30,Example Store,Shopping,1200,Regret,Imported from CSV\n"
        )

        res = self.client.post(
            "/api/transactions/import-csv",
            data={"account_id": str(account.id)},
            files={"file": ("statement.csv", csv_content, "text/csv")},
            headers={"Authorization": f"Bearer {token}"}
        )

        self.assertEqual(res.status_code, 200)
        self.assertIn("ingested", res.json()["message"].lower())

if __name__ == "__main__":
    unittest.main()
