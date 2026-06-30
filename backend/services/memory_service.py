import os
import asyncio
import logging
from datetime import datetime
import cognee
from backend.config import Config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Apply Cognee configuration from our Config class
os.environ["LLM_PROVIDER"] = Config.LLM_PROVIDER
os.environ["LLM_API_KEY"] = Config.LLM_API_KEY
os.environ["LLM_MODEL"] = Config.LLM_MODEL

os.environ["EMBEDDING_PROVIDER"] = Config.EMBEDDING_PROVIDER
os.environ["EMBEDDING_API_KEY"] = Config.EMBEDDING_API_KEY
os.environ["EMBEDDING_MODEL"] = Config.EMBEDDING_MODEL

# Map credentials to provider-specific environment variables for LiteLLM
llm_provider = Config.LLM_PROVIDER.lower().strip()
if "openai" in llm_provider:
    os.environ["OPENAI_API_KEY"] = Config.LLM_API_KEY
elif "gemini" in llm_provider or "google" in llm_provider:
    os.environ["GEMINI_API_KEY"] = Config.LLM_API_KEY

embed_provider = Config.EMBEDDING_PROVIDER.lower().strip()
if "openai" in embed_provider:
    os.environ["OPENAI_API_KEY"] = Config.EMBEDDING_API_KEY or Config.LLM_API_KEY
elif "gemini" in embed_provider or "google" in embed_provider:
    os.environ["GEMINI_API_KEY"] = Config.EMBEDDING_API_KEY or Config.LLM_API_KEY

# Database configurations
os.environ["DB_PROVIDER"] = Config.DB_PROVIDER
os.environ["VECTOR_DB_PROVIDER"] = Config.VECTOR_DB_PROVIDER
os.environ["GRAPH_DATABASE_PROVIDER"] = Config.GRAPH_DATABASE_PROVIDER

async def remember_transaction(user_id: int, amount: float, merchant: str, category: str, date_str: str, sentiment: str, note: str = ""):
    """
    Ingests a transaction event into Cognee memory.
    """
    session_id = f"user_{user_id}"
    event_description = (
        f"On {date_str}, the user spent {amount} units at {merchant} under the category '{category}'. "
        f"The user marked this purchase with a '{sentiment}' feeling. Note: {note or 'none'}"
    )
    
    try:
        # Ingest into session memory (fast cache) and permanent memory
        await cognee.remember(event_description, session_id=session_id)
        logger.info(f"Cognee remembered transaction: user_{user_id}, {amount} at {merchant}")
        return True
    except Exception as e:
        logger.error(f"Error in cognee.remember for transaction: {str(e)}")
        return False

async def remember_transactions_batch(user_id: int, descriptions: list[str]):
    """
    Ingests multiple transactions in a single batch into Cognee memory.
    """
    if not descriptions:
        return True
    session_id = f"user_{user_id}"
    combined_text = "\n".join(descriptions)
    try:
        await cognee.remember(combined_text, session_id=session_id)
        logger.info(f"Cognee batch remembered {len(descriptions)} transactions for user_{user_id}")
        return True
    except Exception as e:
        logger.error(f"Error in cognee.remember batch: {str(e)}")
        return False

async def remember_obligation(user_id: int, name: str, amount: float, due_date_str: str, interval: str):
    """
    Ingests a recurring commitment or future obligation into Cognee memory.
    """
    session_id = f"user_{user_id}"
    obligation_desc = (
        f"The user has a recurring financial commitment named '{name}' of amount {amount} due {interval} on {due_date_str}."
    )
    
    try:
        await cognee.remember(obligation_desc, session_id=session_id)
        logger.info(f"Cognee remembered obligation: user_{user_id}, {name} of {amount}")
        return True
    except Exception as e:
        logger.error(f"Error in cognee.remember for obligation: {str(e)}")
        return False

async def remember_goal(user_id: int, name: str, target_amount: float, target_date_str: str):
    """
    Ingests a savings goal into Cognee memory.
    """
    session_id = f"user_{user_id}"
    goal_desc = (
        f"The user has a financial savings target named '{name}' to save {target_amount} by {target_date_str}."
    )
    
    try:
        await cognee.remember(goal_desc, session_id=session_id)
        logger.info(f"Cognee remembered goal: user_{user_id}, {name}")
        return True
    except Exception as e:
        logger.error(f"Error in cognee.remember for goal: {str(e)}")
        return False

async def recall_financial_context(user_id: int, query: str) -> list:
    """
    Queries Cognee memory to fetch context matching the user's inquiry.
    """
    session_id = f"user_{user_id}"
    try:
        results = await cognee.recall(query_text=query, session_id=session_id)
        # Cognee recall returns a list of results (often strings or document chunks)
        formatted_results = []
        for result in results:
            # Safely get text representation from the result object or dictionary
            if isinstance(result, str):
                formatted_results.append(result)
            elif hasattr(result, "text"):
                formatted_results.append(result.text)
            elif isinstance(result, dict) and "text" in result:
                formatted_results.append(result["text"])
            else:
                formatted_results.append(str(result))
        return formatted_results
    except Exception as e:
        logger.error(f"Error in cognee.recall: {str(e)}")
        return []

async def improve_memory(user_id: int):
    """
    Triggers Cognee self-improvement/memify loop to bridge session cache to the permanent graph.
    """
    try:
        # cognee.improve() consolidates session data and strengthens graph connections
        # Note: Depending on version, improve may be parameterless or take specific arguments.
        # We call the core improve operation.
        await cognee.improve()
        logger.info(f"Cognee completed memory improvement cycle.")
        return True
    except Exception as e:
        logger.error(f"Error in cognee.improve: {str(e)}")
        return False

async def forget_all_user_memory(user_id: int):
    """
    Prunes the user's dataset from Cognee memory.
    """
    try:
        # We can forget specific datasets or clear the graph when reset is requested.
        await cognee.forget(dataset=f"user_{user_id}")
        logger.info(f"Cognee deleted memory for user_{user_id}")
        return True
    except Exception as e:
        logger.error(f"Error in cognee.forget: {str(e)}")
        return False
