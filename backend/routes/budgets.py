from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
import cognee
from backend.db_setup import get_db, Budget, User
from backend.routes.auth import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["budgets"])

class BudgetCreate(BaseModel):
    category: str
    limit_amount: float

class BudgetResponse(BaseModel):
    id: int
    category: str
    limit_amount: float
    current_spending: float

    class Config:
        from_attributes = True

@router.get("/", response_model=List[BudgetResponse])
def get_budgets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Budget).filter(Budget.user_id == current_user.id).all()

@router.post("/", response_model=BudgetResponse)
async def create_or_update_budget(
    budget_data: BudgetCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    budget = db.query(Budget).filter(
        Budget.user_id == current_user.id, 
        Budget.category == budget_data.category
    ).first()

    if budget:
        budget.limit_amount = budget_data.limit_amount
    else:
        budget = Budget(
            user_id=current_user.id,
            category=budget_data.category,
            limit_amount=budget_data.limit_amount,
            current_spending=0.0
        )
        db.add(budget)

    db.commit()
    db.refresh(budget)

    # Ingest constraint into Cognee Memory
    session_id = f"user_{current_user.id}"
    try:
        await cognee.remember(
            f"The user configured a monthly budget limit of {budget.limit_amount} for the category '{budget.category}'.",
            session_id=session_id
        )
    except Exception as e:
        pass # Non-fatal if Cognee fails during constraint updates

    return budget
