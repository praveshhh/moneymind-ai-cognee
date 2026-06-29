from sqlalchemy import create_engine, Column, Integer, Float, String, Boolean, Date, DateTime, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
from backend.config import Config

engine = create_engine(
    Config.DATABASE_URL, 
    connect_args={"check_same_thread": False} if "sqlite" in Config.DATABASE_URL else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    monthly_income = Column(Float, default=0.0)
    savings_goal = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    accounts = relationship("Account", back_populates="owner", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="user", cascade="all, delete-orphan")
    bills = relationship("Bill", back_populates="user", cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # checking, savings, credit
    balance = Column(Float, default=0.0)

    owner = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    amount = Column(Float, nullable=False)  # positive = debit, negative = credit
    merchant = Column(String, nullable=False)
    category = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    type = Column(String, nullable=False)  # debit, credit
    sentiment = Column(String, default="Neutral")  # Happy, Neutral, Regret
    note = Column(Text, nullable=True)

    user = relationship("User", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String, nullable=False)
    limit_amount = Column(Float, nullable=False)
    current_spending = Column(Float, default=0.0)

    user = relationship("User", back_populates="budgets")

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Float, nullable=False)
    current_amount = Column(Float, default=0.0)
    target_date = Column(Date, nullable=False)
    status = Column(String, default="Active")  # Active, Completed, Delayed

    user = relationship("User", back_populates="goals")

class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, nullable=False)
    is_recurring = Column(Boolean, default=True)
    interval = Column(String, default="monthly")  # weekly, monthly, yearly
    status = Column(String, default="Unpaid")  # Paid, Unpaid

    user = relationship("User", back_populates="bills")

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
