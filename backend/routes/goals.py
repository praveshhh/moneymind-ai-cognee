from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
from backend.db_setup import get_db, Goal, User
from backend.routes.auth import get_current_user
from backend.services.memory_service import remember_goal

router = APIRouter(prefix="/api/goals", tags=["goals"])

class GoalCreate(BaseModel):
    name: str
    target_amount: float
    current_amount: float
    target_date: str  # YYYY-MM-DD

class GoalResponse(BaseModel):
    id: int
    name: str
    target_amount: float
    current_amount: float
    target_date: str
    status: str

    class Config:
        from_attributes = True

@router.get("/", response_model=List[GoalResponse])
def get_goals(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    res = []
    for g in goals:
        res.append(GoalResponse(
            id=g.id,
            name=g.name,
            target_amount=g.target_amount,
            current_amount=g.current_amount,
            target_date=str(g.target_date),
            status=g.status
        ))
    return res

@router.post("/", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        t_date = datetime.strptime(goal_data.target_date, "%Y-%m-%d").date()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format, use YYYY-MM-DD")

    new_goal = Goal(
        user_id=current_user.id,
        name=goal_data.name,
        target_amount=goal_data.target_amount,
        current_amount=goal_data.current_amount,
        target_date=t_date,
        status="Active"
    )
    db.add(new_goal)
    db.commit()
    db.refresh(new_goal)

    # Ingest goal into Cognee
    await remember_goal(
        user_id=current_user.id,
        name=new_goal.name,
        target_amount=new_goal.target_amount,
        target_date_str=goal_data.target_date
    )

    return GoalResponse(
        id=new_goal.id,
        name=new_goal.name,
        target_amount=new_goal.target_amount,
        current_amount=new_goal.current_amount,
        target_date=str(new_goal.target_date),
        status=new_goal.status
    )
