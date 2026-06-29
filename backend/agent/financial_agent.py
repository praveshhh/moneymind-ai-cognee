import json
import httpx
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from backend.config import Config
from backend.db_setup import Account, Bill, Goal, User, Transaction
from backend.services.memory_service import recall_financial_context

logger = logging.getLogger(__name__)

# System prompt directing the LLM to act as the Financial Memory Brain
SYSTEM_PROMPT = """You are MoneyMind AI, the user's personalized Financial Memory Assistant. 
Your goal is to help the user make smart financial decisions by reasoning over their current financial state, upcoming commitments, and historical behavior retrieved from their memory.

You must analyze:
1. Current account balances and cash flow.
2. Upcoming obligations (recurring bills, rent, SIP investments) due within the next 30 days.
3. Historical memory retrieved from Cognee (past purchases, emotional regret ratings, habits).
4. Long-term goals (savings targets).

Based on this, you must output a structured JSON response evaluating the proposed action.
Your response MUST be valid JSON matching the following structure:
{
  "decision": "Safe" | "Risk" | "Unsafe",
  "reasons": [
    "Reason 1 based on obligations",
    "Reason 2 based on memory and emotional regret patterns"
  ],
  "simulated_balance_after_purchase": 12345.67,
  "mood_warning": "Warning about past regrets (if any, retrieved from memory)",
  "response_text": "A friendly conversational explanation summarizing the decision."
}
"""

async def call_llm(system_prompt: str, user_prompt: str) -> str:
    """
    Executes a prompt against OpenAI or Gemini using direct HTTP requests.
    """
    provider = Config.LLM_PROVIDER.lower().strip()
    api_key = Config.LLM_API_KEY
    
    if not api_key:
        logger.warning("LLM API key is missing. Returning mock response.")
        return json.dumps({
            "decision": "Risk",
            "reasons": ["LLM API Key not configured in .env"],
            "simulated_balance_after_purchase": 0.0,
            "mood_warning": "No LLM credentials found.",
            "response_text": "I can see your financial details, but my AI reasoning brain is currently offline because the LLM API key is not configured in the `.env` file."
        })

    try:
        if "gemini" in provider or "google" in provider:
            # Call Google Gemini API
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"{system_prompt}\n\nUser Profile & Request:\n{user_prompt}"}]
                    }
                ],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                else:
                    logger.error(f"Gemini API returned error: {res.status_code} - {res.text}")
                    raise Exception(f"Gemini API error: {res.text}")

        else:
            # Default to OpenAI Chat Completion
            url = "https://api.openai.com/v1/chat/completions"
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}"
            }
            payload = {
                "model": Config.LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "response_format": {"type": "json_object"}
            }
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.error(f"OpenAI API returned error: {res.status_code} - {res.text}")
                    raise Exception(f"OpenAI API error: {res.text}")

    except Exception as e:
        logger.error(f"Error calling LLM provider {provider}: {str(e)}")
        # Graceful fallback response
        return json.dumps({
            "decision": "Risk",
            "reasons": [f"Failed to communicate with LLM API: {str(e)}"],
            "simulated_balance_after_purchase": 0.0,
            "mood_warning": "",
            "response_text": "I encountered an issue connecting to my AI brain. Let me check my connections."
        })

async def analyze_purchase_request(db: Session, user_id: int, user_message: str) -> dict:
    """
    Main entrypoint to evaluate a purchase request.
    """
    # 1. Fetch Relational Data
    user = db.query(User).filter(User.id == user_id).first()
    accounts = db.query(Account).filter(Account.user_id == user_id).all()
    
    # Calculate current net checking/savings balance
    total_checking_savings = sum(acc.balance for acc in accounts if acc.type in ["checking", "savings"])
    credit_balance = sum(acc.balance for acc in accounts if acc.type == "credit")
    
    # Fetch upcoming bills due in next 30 days
    today = datetime.utcnow().date()
    thirty_days_later = today + timedelta(days=30)
    upcoming_bills = db.query(Bill).filter(
        Bill.user_id == user_id,
        Bill.due_date >= today,
        Bill.due_date <= thirty_days_later,
        Bill.status == "Unpaid"
    ).all()
    
    bills_list = [{"name": b.name, "amount": b.amount, "due_date": str(b.due_date)} for b in upcoming_bills]
    total_upcoming_obligations = sum(b.amount for b in upcoming_bills)
    
    # Fetch long-term goals
    active_goals = db.query(Goal).filter(Goal.user_id == user_id, Goal.status == "Active").all()
    goals_list = [{"name": g.name, "target_amount": g.target_amount, "current_amount": g.current_amount, "target_date": str(g.target_date)} for g in active_goals]
    
    # 2. Query Cognee Memory Graph
    # We recall past financial behaviors, regret patterns, and related merchants from Cognee
    recalled_memories = await recall_financial_context(user_id, query=user_message)
    
    # 3. Assemble User Prompt for LLM
    financial_context = {
        "user_message": user_message,
        "current_date": str(today),
        "income": user.monthly_income,
        "savings_goal": user.savings_goal,
        "financial_assets": {
            "checking_savings_balance": total_checking_savings,
            "credit_card_debt": credit_balance,
            "net_liquidity": total_checking_savings - credit_balance
        },
        "upcoming_obligations_next_30_days": {
            "total_amount": total_upcoming_obligations,
            "details": bills_list
        },
        "active_savings_goals": goals_list,
        "recalled_memories_from_cognee": recalled_memories
    }
    
    user_prompt = json.dumps(financial_context, indent=2)
    logger.info(f"Financial Context compiled. Sending to LLM...")
    
    # 4. Invoke Reasoning LLM
    raw_response = await call_llm(SYSTEM_PROMPT, user_prompt)
    
    try:
        analysis_result = json.loads(raw_response)
        # Append thinking log for UI clarity
        analysis_result["thinking_path"] = {
            "recalled_memories": recalled_memories,
            "checked_assets": f"Liquidity: {total_checking_savings}, Bills: {total_upcoming_obligations}",
            "goals_scanned": len(goals_list)
        }
        return analysis_result
    except Exception as e:
        logger.error(f"Failed to parse LLM json response: {raw_response}. Error: {str(e)}")
        return {
            "decision": "Risk",
            "reasons": ["Failed to structure AI reasoning"],
            "simulated_balance_after_purchase": total_checking_savings,
            "mood_warning": "",
            "response_text": "I analyzed your request, but I'm having trouble formatting the response. " + raw_response,
            "thinking_path": {"recalled_memories": recalled_memories}
        }
