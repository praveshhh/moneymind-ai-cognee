import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
from backend.db_setup import get_db, Transaction, Account, User
from backend.routes.auth import get_current_user
from backend.services.memory_service import remember_transaction

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

class TransactionCreate(BaseModel):
    account_id: int
    amount: float  # Positive for debit, negative for credit
    merchant: str
    category: str
    sentiment: str  # Happy, Neutral, Regret
    note: Optional[str] = ""

class TransactionResponse(BaseModel):
    id: int
    account_id: int
    amount: float
    merchant: str
    category: str
    date: str
    type: str
    sentiment: str
    note: Optional[str]

    class Config:
        from_attributes = True

@router.get("/", response_model=List[TransactionResponse])
def get_transactions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.desc()).all()
    # Format date to string for JSON serialization
    res = []
    for t in txs:
        res.append(TransactionResponse(
            id=t.id,
            account_id=t.account_id,
            amount=t.amount,
            merchant=t.merchant,
            category=t.category,
            date=str(t.date),
            type=t.type,
            sentiment=t.sentiment,
            note=t.note
        ))
    return res

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    tx_data: TransactionCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == tx_data.account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Update account balance
    # In standard banking: debit increases credit card debt, decreases checking balance.
    # We subtract the amount from checking/savings balance, add to credit balance.
    if account.type in ["checking", "savings"]:
        account.balance -= tx_data.amount
    else:
        account.balance += tx_data.amount

    tx_type = "debit" if tx_data.amount > 0 else "credit"
    new_tx = Transaction(
        user_id=current_user.id,
        account_id=tx_data.account_id,
        amount=tx_data.amount,
        merchant=tx_data.merchant,
        category=tx_data.category,
        date=datetime.utcnow().date(),
        type=tx_type,
        sentiment=tx_data.sentiment,
        note=tx_data.note
    )
    db.add(new_tx)
    db.commit()
    db.refresh(new_tx)

    # Ingest into Cognee Memory Graph asynchronously
    date_str = str(new_tx.date)
    await remember_transaction(
        user_id=current_user.id,
        amount=new_tx.amount,
        merchant=new_tx.merchant,
        category=new_tx.category,
        date_str=date_str,
        sentiment=new_tx.sentiment,
        note=new_tx.note
    )

    return TransactionResponse(
        id=new_tx.id,
        account_id=new_tx.account_id,
        amount=new_tx.amount,
        merchant=new_tx.merchant,
        category=new_tx.category,
        date=date_str,
        type=new_tx.type,
        sentiment=new_tx.sentiment,
        note=new_tx.note
    )

@router.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    account_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    contents = await file.read()
    string_data = contents.decode("utf-8")
    csv_file = StringIO(string_data)
    reader = csv.DictReader(csv_file)

    imported_count = 0
    for row in reader:
        # Expected CSV columns: date, merchant, category, amount, sentiment, note
        try:
            amount = float(row.get("amount", 0.0))
            merchant = row.get("merchant", "Unknown Merchant")
            category = row.get("category", "Uncategorized")
            date_str = row.get("date", datetime.utcnow().strftime("%Y-%m-%d"))
            tx_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            sentiment = row.get("sentiment", "Neutral")
            note = row.get("note", "")

            tx_type = "debit" if amount > 0 else "credit"

            # Create Transaction
            new_tx = Transaction(
                user_id=current_user.id,
                account_id=account_id,
                amount=amount,
                merchant=merchant,
                category=category,
                date=tx_date,
                type=tx_type,
                sentiment=sentiment,
                note=note
            )
            db.add(new_tx)

            # Update balance
            if account.type in ["checking", "savings"]:
                account.balance -= amount
            else:
                account.balance += amount

            # Ingest to Cognee Memory
            await remember_transaction(
                user_id=current_user.id,
                amount=amount,
                merchant=merchant,
                category=category,
                date_str=date_str,
                sentiment=sentiment,
                note=note
            )
            imported_count += 1
        except Exception as e:
            # Skip invalid rows
            continue

    db.commit()
    return {"message": f"Successfully parsed CSV statement. Ingested {imported_count} transactions into SQL database and Cognee memory graph."}

@router.post("/mock-sms")
async def mock_sms_webhook(
    sms_text: str = Form(...),
    account_id: int = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulates real-time transaction ingestion via a mock SMS hook.
    Format example: "ALERT: Spent Rs 2500 at Nike Shoes on checking card xx123"
    We will parse the amount and merchant from the string.
    """
    account = db.query(Account).filter(Account.id == account_id, Account.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Simple parsing logic
    words = sms_text.split()
    amount = 0.0
    merchant = "Merchant"
    
    # Try to find "Rs" or numbers
    for i, word in enumerate(words):
        if word.lower() in ["rs", "inr", "usd", "$"]:
            try:
                amount = float(words[i+1].replace(",", ""))
            except:
                pass
        if word.lower() == "at":
            try:
                # Get the next two words as merchant name
                merchant = f"{words[i+1]} {words[i+2]}"
            except:
                merchant = words[i+1]

    if amount == 0.0:
        # Fallback search for any numbers
        for word in words:
            try:
                amount = float(word.replace(",", ""))
                break
            except:
                pass

    # Create transaction
    new_tx = Transaction(
        user_id=current_user.id,
        account_id=account_id,
        amount=amount,
        merchant=merchant,
        category="Shopping",
        date=datetime.utcnow().date(),
        type="debit",
        sentiment="Neutral",
        note=f"Parsed from mock SMS: '{sms_text}'"
    )
    db.add(new_tx)
    
    if account.type in ["checking", "savings"]:
        account.balance -= amount
    else:
        account.balance += amount

    db.commit()
    db.refresh(new_tx)

    # Ingest to Cognee
    await remember_transaction(
        user_id=current_user.id,
        amount=amount,
        merchant=merchant,
        category="Shopping",
        date_str=str(new_tx.date),
        sentiment="Neutral",
        note=new_tx.note
    )

    return {
        "message": f"Successfully parsed and ingested transaction from mock SMS.",
        "amount": amount,
        "merchant": merchant,
        "transaction_id": new_tx.id
    }
