import asyncio
import os
import sys

# Ensure backend root is in PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Import config and load env variables
from backend.config import Config

# Mock LLM API Key for local test if not set (to prevent exceptions during import)
if not os.getenv("LLM_API_KEY") and not Config.LLM_API_KEY:
    print("Warning: LLM_API_KEY not found in environment. Setting dummy key for testing.")
    os.environ["LLM_API_KEY"] = "sk-mock-key-for-test-purposes-only-12345"

import cognee

async def run_test():
    print("Initializing Cognee settings...")
    print(f"LLM Provider: {os.environ.get('LLM_PROVIDER', 'openai')}")
    print(f"DB Provider: {os.environ.get('DB_PROVIDER', 'sqlite')}")
    print(f"Vector DB: {os.environ.get('VECTOR_DB_PROVIDER', 'lancedb')}")
    print(f"Graph DB: {os.environ.get('GRAPH_DATABASE_PROVIDER', 'kuzu')}")

    test_text = "On 2026-06-29, the user spent INR 8,999 on Amazon under the category 'Shopping' with a 'Regret' feeling."
    print(f"\n1. Ingesting test transaction memory: '{test_text}'")
    try:
        # Remember test data in a session
        await cognee.remember(test_text, session_id="user_test")
        print("Success! Ingested into memory.")
    except Exception as e:
        print(f"Failed to ingest: {str(e)}")
        return

    print("\n2. Recalling context for query: 'What did the user buy on Amazon?'")
    try:
        results = await cognee.recall(query_text="What did the user buy on Amazon?", session_id="user_test")
        print("Success! Recalled memories:")
        for idx, res in enumerate(results):
            print(f"[{idx}] {res}")
    except Exception as e:
        print(f"Failed to recall: {str(e)}")

    print("\n3. Running memory self-improvement cycle...")
    try:
        await cognee.improve()
        print("Success! Graph self-improved.")
    except Exception as e:
        print(f"Failed to run improve: {str(e)}")

if __name__ == "__main__":
    asyncio.run(run_test())
