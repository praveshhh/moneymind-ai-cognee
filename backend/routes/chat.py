import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from backend.db_setup import get_db, Transaction, Bill, Goal, User
from backend.routes.auth import get_current_user
from backend.agent.financial_agent import analyze_purchase_request
from backend.services.memory_service import remember_transaction, improve_memory, forget_all_user_memory

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

class ChatRequest(BaseModel):
    message: str

class FeedbackRequest(BaseModel):
    transaction_id: int
    sentiment: str  # Happy, Neutral, Regret

@router.post("/")
async def chat_with_advisor(
    req: ChatRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # Run the reasoning engine
        result = await analyze_purchase_request(db, current_user.id, req.message)
        return result
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/feedback")
async def update_sentiment_feedback(
    req: FeedbackRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tx = db.query(Transaction).filter(Transaction.id == req.transaction_id, Transaction.user_id == current_user.id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found")

    old_sentiment = tx.sentiment
    tx.sentiment = req.sentiment
    db.commit()

    # Re-ingest to update Cognee's graph
    # Overwriting the record in the session/graph
    await remember_transaction(
        user_id=current_user.id,
        amount=tx.amount,
        merchant=tx.merchant,
        category=tx.category,
        date_str=str(tx.date),
        sentiment=tx.sentiment,
        note=tx.note or f"Updated sentiment from {old_sentiment} to {req.sentiment}"
    )

    # Run the self-improvement/memify loop in the background
    await improve_memory(current_user.id)

    return {"message": f"Updated transaction {tx.id} sentiment to {req.sentiment} and refreshed Cognee memory."}

@router.post("/clear")
async def clear_memory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Clear database transaction notes & sentiments
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).all()
    for t in txs:
        t.sentiment = "Neutral"
    db.commit()

    # 2. Clear Cognee
    await forget_all_user_memory(current_user.id)
    return {"message": "Memory graph successfully cleared."}

@router.get("/graph")
def get_memory_graph(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Serializes the mirrored relational data into a clean Node-Link graph 
    representing Cognee's schema ontology for frontend rendering.
    """
    nodes = []
    edges = []
    node_ids = set()

    def add_node(id_: str, label: str, val: str, type_: str, details: Dict[str, Any] = None):
        if id_ not in node_ids:
            nodes.append({
                "id": id_,
                "label": label,
                "value": val,
                "type": type_,
                "properties": details or {}
            })
            node_ids.add(id_)

    def add_edge(source: str, target: str, label: str):
        edges.append({
            "source": source,
            "target": target,
            "label": label
        })

    # 1. Root User Node
    user_node_id = f"user_{current_user.id}"
    add_node(user_node_id, current_user.username, f"Income: {current_user.monthly_income}", "user")

    # 2. Goals
    goals = db.query(Goal).filter(Goal.user_id == current_user.id).all()
    for g in goals:
        goal_id = f"goal_{g.id}"
        add_node(goal_id, g.name, f"Target: {g.target_amount} (Current: {g.current_amount})", "goal", {
            "target_amount": g.target_amount,
            "current_amount": g.current_amount,
            "target_date": str(g.target_date)
        })
        add_edge(user_node_id, goal_id, "HAS_GOAL")

    # 3. Obligations (Bills)
    bills = db.query(Bill).filter(Bill.user_id == current_user.id).all()
    for b in bills:
        bill_id = f"bill_{b.id}"
        add_node(bill_id, b.name, f"Amount: {b.amount} (Due: {str(b.due_date)})", "obligation", {
            "amount": b.amount,
            "due_date": str(b.due_date),
            "status": b.status
        })
        add_edge(user_node_id, bill_id, "HAS_OBLIGATION")

    # 4. Transactions, Merchants, Categories, and Sentiments
    txs = db.query(Transaction).filter(Transaction.user_id == current_user.id).order_by(Transaction.date.asc()).all()
    prev_tx_id = None
    
    for t in txs:
        tx_id = f"tx_{t.id}"
        add_node(tx_id, f"{t.merchant}", f"Amt: {t.amount} ({str(t.date)})", "transaction", {
            "amount": t.amount,
            "category": t.category,
            "date": str(t.date),
            "sentiment": t.sentiment,
            "note": t.note
        })
        add_edge(user_node_id, tx_id, "MADE_TRANSACTION")

        # Merchant Node
        merch_id = f"merch_{t.merchant.replace(' ', '_').lower()}"
        add_node(merch_id, t.merchant, "Merchant", "merchant")
        add_edge(tx_id, merch_id, "SPENT_AT")

        # Category Node
        cat_id = f"cat_{t.category.lower()}"
        add_node(cat_id, t.category, "Category", "category")
        add_edge(tx_id, cat_id, "BELONGS_TO")

        # Sentiment Node
        if t.sentiment:
            sent_id = f"sent_{t.sentiment.lower()}"
            emoji = "🙂 Happy" if t.sentiment == "Happy" else "🙁 Regret" if t.sentiment == "Regret" else "😐 Neutral"
            add_node(sent_id, emoji, "Sentiment", "sentiment")
            add_edge(tx_id, sent_id, "HAS_EMOTION")

        # Temporal Edge (Transaction sequencing)
        if prev_tx_id:
            add_edge(prev_tx_id, tx_id, "OCCURRED_BEFORE")
        prev_tx_id = tx_id

    return {
        "nodes": nodes,
        "edges": edges
    }
