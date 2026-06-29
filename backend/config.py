import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-money-mind-token-key-change-in-prod")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 1 day for local testing

    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./moneymind.db")

    # LLM Settings
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")  # openai, google_gemini, anthropic
    LLM_API_KEY = os.getenv("LLM_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")

    # Embeddings
    EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "openai")
    EMBEDDING_API_KEY = os.getenv("EMBEDDING_API_KEY", "")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

    # Cognee Settings
    DB_PROVIDER = os.getenv("DB_PROVIDER", "sqlite")
    VECTOR_DB_PROVIDER = os.getenv("VECTOR_DB_PROVIDER", "lancedb")
    GRAPH_DATABASE_PROVIDER = os.getenv("GRAPH_DATABASE_PROVIDER", "kuzu")
