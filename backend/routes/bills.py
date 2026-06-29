from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
from backend.db_setup import get_db, Bill, User
from backend.routes.auth import get_current_user
from backend.services.memory_service import remember_obligation

router = APIRouter(prefix="/api/bills", tags=["bills"])

class BillCreate(BaseModel):
    name: str
    amount: float
    due_date: str  # YYYY-MM-DD
    is_recurring: bool
    interval: str  # weekly, monthly, yearly

class BillResponse(BaseModel):
    id: int
    name: str
    amount: float
    due_date: str
    is_recurring: bool
    interval: str
    status: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[BillResponse])
def get_bills(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    bills = db.query(Bill).filter(Bill.user_id == current_user.id).all()
    res = []
    for b in bills:
        res.append(BillResponse(
            id=b.id,
            name=b.name,
            amount=b.amount,
            due_date=str(b.due_date),
            is_recurring=b.is_recurring,
            interval=b.interval,
            status=b.status
        ))
    return res

@router.post("/", response_model=BillResponse)
async def create_bill(
    bill_data: BillCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        d_date = datetime.strptime(bill_data.due_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    new_bill = Bill(
        user_id=current_user.id,
        name=bill_data.name,
        amount=bill_data.amount,
        due_date=d_date,
        is_recurring=bill_data.is_recurring,
        interval=bill_data.interval,
        status="Unpaid"
    )
    db.add(new_bill)
    db.commit()
    db.refresh(new_bill)

    # Ingest obligation into Cognee
    await remember_obligation(
        user_id=current_user.id,
        name=new_bill.name,
        amount=new_bill.amount,
        due_date_str=bill_data.due_date,
        interval=new_bill.interval
    )

    return BillResponse(
        id=new_bill.id,
        name=new_bill.name,
        amount=new_bill.amount,
        due_date=str(new_bill.due_date),
        is_recurring=new_bill.is_recurring,
        interval=new_bill.interval,
        status=new_bill.status
    )
