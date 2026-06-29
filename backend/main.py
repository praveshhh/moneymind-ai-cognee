import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db_setup import init_db
from backend.routes import auth, transactions, budgets, goals, bills, chat

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("main")

app = FastAPI(
    title="MoneyMind AI API",
    description="Backend API for Cognee-Powered Financial Memory Assistant",
    version="1.0.0"
)

# Enable CORS for frontend cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins for local hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database tables on startup
@app.on_event("startup")
def startup_event():
    logger.info("Initializing SQLite database...")
    init_db()
    logger.info("Database initialized successfully.")

# Include routers
app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(budgets.router)
app.include_router(goals.router)
app.include_router(bills.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to MoneyMind AI: Cognee-powered Financial Memory Assistant API."}
