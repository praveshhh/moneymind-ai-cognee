import csv
from io import StringIO
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from datetime import datetime
from pydantic import BaseModel
from typing import List, Optional
from backend.db_setup import get_db, Transaction, Account, User
from backend.routes.auth import get_current_user
from backend.services.memory_service import remember_transaction, remember_transactions_batch

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
    rows = []
    
    filename_lower = file.filename.lower()
    if filename_lower.endswith(".pdf"):
        import pypdf
        import io
        import re
        
        pdf_file = io.BytesIO(contents)
        reader = pypdf.PdfReader(pdf_file)
        
        tx_start_pattern = re.compile(r"^\s*(\d+)\s+(\d{2}\s+[A-Za-z]{3}\s+\d{4})\s*(.*)$")
        
        def parse_amount(val_str):
            val_str = val_str.replace(",", "").strip()
            try:
                return float(val_str)
            except ValueError:
                return None

        months_map = {
            "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
            "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
        }

        def format_date(date_str):
            parts = date_str.split()
            if len(parts) == 3:
                day, month_name, year = parts
                month = months_map.get(month_name, "01")
                return f"{year}-{month}-{day}"
            return date_str

        def clean_merchant(desc):
            desc_clean = desc.replace("M/S.", "MS ")
            if desc_clean.startswith("UPI/"):
                parts = desc_clean.split("/")
                if len(parts) > 1:
                    candidate = parts[1].strip()
                    if candidate and not candidate.isdigit() and len(candidate) > 2:
                        return candidate
            return desc[:40].strip()

        def get_category(desc, amount):
            desc_lower = desc.lower()
            if amount < 0:
                return "Income"
            
            if any(k in desc_lower for k in ["sweet", "food", "zomato", "swiggy", "burger", "domino", "jain", "deli", "kitchen"]):
                return "Food"
            if any(k in desc_lower for k in ["amazon", "shopping", "decathlon", "myntra", "nike", "zepto", "star bazaar", "kirana", "supermar"]):
                return "Shopping"
            if any(k in desc_lower for k in ["railway", "irctc", "travel", "ola", "uber", "cab", "rapido", "clearing"]):
                return "Travel"
            if any(k in desc_lower for k in ["spotify", "netflix", "jiohotstar", "hotstar", "youtube", "google play", "playstore"]):
                return "Entertainment"
            if any(k in desc_lower for k in ["rent", "bill", "electricity", "recharge", "tata sky", "neon-1", "broadband", "phonepe"]):
                return "Utilities"
            if any(k in desc_lower for k in ["dietico", "health", "medical", "hospital", "pharmacy"]):
                return "Health"
            
            return "Others"

        def get_sentiment(desc, category, amount):
            desc_lower = desc.lower()
            if category == "Income":
                return "Happy"
            if category in ["Food", "Shopping"] and amount > 500:
                if any(k in desc_lower for k in ["swiggy", "zomato", "domino", "decathlon", "amazon"]):
                    return "Regret"
            return "Neutral"

        raw_parsed = []
        current_tx = None

        for page in reader.pages:
            text = page.extract_text()
            if not text:
                continue
            lines = text.split("\n")
            for line in lines:
                line_str = line.strip()
                if not line_str:
                    continue
                    
                match = tx_start_pattern.match(line_str)
                if match:
                    if current_tx:
                        raw_parsed.append(current_tx)
                    index = int(match.group(1))
                    date_str = match.group(2)
                    rem = match.group(3)
                    current_tx = {
                        "index": index,
                        "date": format_date(date_str),
                        "description_parts": [rem],
                        "raw_amount": None,
                        "balance": None
                    }
                    tokens = rem.split()
                    if len(tokens) >= 2:
                        balance_val = parse_amount(tokens[-1])
                        amount_val = parse_amount(tokens[-2])
                        if balance_val is not None and amount_val is not None and "." in tokens[-1] and "." in tokens[-2]:
                            current_tx["balance"] = balance_val
                            current_tx["raw_amount"] = amount_val
                            current_tx["description_parts"] = [" ".join(tokens[:-2])]
                else:
                    if current_tx:
                        tokens = line_str.split()
                        if len(tokens) >= 2:
                            balance_val = parse_amount(tokens[-1])
                            amount_val = parse_amount(tokens[-2])
                            if balance_val is not None and amount_val is not None and "." in tokens[-1] and "." in tokens[-2]:
                                current_tx["balance"] = balance_val
                                current_tx["raw_amount"] = amount_val
                                if len(tokens) > 2:
                                    current_tx["description_parts"].append(" ".join(tokens[:-2]))
                            else:
                                current_tx["description_parts"].append(line_str)
                        else:
                            current_tx["description_parts"].append(line_str)

        if current_tx:
            raw_parsed.append(current_tx)

        # Stateful balance-difference parsing starting from the account's existing balance
        prev_balance = account.balance
        
        for tx in raw_parsed:
            raw_amount = tx["raw_amount"]
            balance = tx["balance"]
            
            if balance is None or raw_amount is None:
                balance = balance or prev_balance
                raw_amount = raw_amount or 0.0
                
            if balance > prev_balance:
                amount = -raw_amount
            else:
                amount = raw_amount
                
            desc_text = " ".join(tx["description_parts"]).strip()
            desc_clean = re.sub(r'\s+', ' ', desc_text)
            
            merchant = clean_merchant(desc_clean)
            category = get_category(desc_clean, amount)
            sentiment = get_sentiment(desc_clean, category, amount)
            
            note = f"Salary/Transfer credit" if category == "Income" else f"UPI Transaction at {merchant}"
            
            rows.append({
                "date": tx["date"],
                "merchant": merchant,
                "category": category,
                "amount": amount,
                "sentiment": sentiment,
                "note": note
            })
            
            prev_balance = balance
    else:
        string_data = contents.decode("utf-8")
        csv_file = StringIO(string_data)
        reader = csv.DictReader(csv_file)
        for row in reader:
            try:
                rows.append({
                    "date": row.get("date", datetime.utcnow().strftime("%Y-%m-%d")),
                    "merchant": row.get("merchant", "Unknown Merchant"),
                    "category": row.get("category", "Uncategorized"),
                    "amount": float(row.get("amount", 0.0)),
                    "sentiment": row.get("sentiment", "Neutral"),
                    "note": row.get("note", "")
                })
            except:
                continue

    imported_count = 0
    descriptions = []
    
    for row in rows:
        try:
            amount = row["amount"]
            merchant = row["merchant"]
            category = row["category"]
            date_str = row["date"]
            tx_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            sentiment = row["sentiment"]
            note = row["note"]

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

            # Accumulate description for batching
            event_desc = (
                f"On {date_str}, the user spent {amount} units at {merchant} under the category '{category}'. "
                f"Sentiment: {sentiment}. Note: {note or 'none'}"
            )
            descriptions.append(event_desc)
            imported_count += 1
        except Exception as e:
            continue

    # Ingest all transactions in a single batch call to Cognee (blazing fast!)
    if descriptions:
        await remember_transactions_batch(user_id=current_user.id, descriptions=descriptions)

    db.commit()
    file_type_label = "PDF" if filename_lower.endswith(".pdf") else "CSV"
    return {"message": f"Successfully parsed {file_type_label} statement. Ingested {imported_count} transactions into SQL database and Cognee memory graph."}

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

class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    balance: float

    class Config:
        from_attributes = True

@router.get("/accounts", response_model=List[AccountResponse])
def get_accounts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    accounts = db.query(Account).filter(Account.user_id == current_user.id).all()
    return accounts
