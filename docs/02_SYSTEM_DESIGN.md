# System Design - MoneyMind AI

This document outlines the software architecture and module interactions for MoneyMind AI.

## 1. System Architecture

The project is structured into three layers:
1. **Frontend (Vite + React)**: Presentational layer, charting, chat terminal, and memory graph visualization.
2. **Backend Services (FastAPI)**: Controller routes, business logic, SQLAlchemy database model storage, and agent reasoning.
3. **Memory Store (Cognee)**: Semantic-graph memory engine capturing user habits, commitments, and feedback.

```
+-------------------------------------------------------------+
|                     Frontend: Vite React                    |
|  [Dashboard]      [AI Chat]     [Timeline]    [Graph Vis]   |
+------------------------------+------------------------------+
                               | REST APIs / WebSockets
                               v
+-------------------------------------------------------------+
|                     Backend: FastAPI                        |
|                                                             |
|   +--------------+   +--------------+   +---------------+   |
|   | Auth/User    |   | Transactions |   | AI Agent &    |   |
|   | Service      |   | & Budgets    |   | Reasoner      |   |
|   +-------+------+   +------+-------+   +-------+-------+   |
|           |                 |                   |           |
+-----------|-----------------|-------------------|-----------+
            | SQLAlchemy      | SQLAlchemy        | recall() / remember()
            v                 v                   v
+--------------------+ +--------------------+ +-----------------+
|   Relational DB    | |   Relational DB    | |  Cognee Memory  |
|      (SQLite)      | |      (SQLite)      | |  (Vector/Graph) |
|   Users / Session  | | Transactions, Bills| | kuzu / lancedb  |
+--------------------+ +--------------------+ +-----------------+
```

---

## 2. Component Design & API Endpoints

### 2.1 Authentication & Profile
- `POST /api/auth/register` - Create user account
- `POST /api/auth/login` - Obtain JWT Token
- `GET /api/auth/me` - Get profile metadata (income, monthly savings goal)

### 2.2 Relational Data Management (SQL Database)
- `GET /api/transactions` - Fetch list of recent transactions
- `POST /api/transactions` - Create manual transaction
- `POST /api/transactions/upload-csv` - Parse bank statements and ingest
- `POST /api/transactions/mock-sms` - Simulates incoming UPI/bank SMS (e.g. from Swiggy/Amazon)
- `GET /api/budgets` & `POST /api/budgets` - Read/Write budgets by category
- `GET /api/goals` & `POST /api/goals` - Manage financial goals (e.g., "Goa Trip", "Buy Laptop")
- `GET /api/bills` & `POST /api/bills` - Manage upcoming bills & subscriptions

### 2.3 AI Agent & Reasoning API
- `POST /api/chat`
  - **Payload**: `{ "message": "Can I buy a PlayStation 5 for $499 today?" }`
  - **Process**:
    1. Retrieve current account balance from SQL DB.
    2. Retrieve upcoming obligations (rent, insurance, SIP) due within 30 days from SQL DB.
    3. Call `cognee.recall(query_text=message)` to check past purchases of similar category, regret ratings, or relevant advice.
    4. Construct a system prompt compiling SQL data + Cognee recalled graph context.
    5. Ask LLM to evaluate risks, cashflow feasibility, and past behaviors.
    6. Return response containing `decision` (Safe, Risk, Unsafe), `reasons` list, `thinking_path` (details of what memory retrieved), and `response_text`.

### 2.4 Cognee Memory Inspection API (For Visual Graph)
- `GET /api/memory/graph`
  - **Returns**: A JSON structure of nodes and edges currently in Cognee memory.
  - **Format**:
    ```json
    {
      "nodes": [
        {"id": "user_1", "label": "User", "properties": {"name": "Alex"}},
        {"id": "t_101", "label": "Transaction", "properties": {"amount": 799, "merchant": "Netflix"}},
        {"id": "cat_ent", "label": "Category", "properties": {"name": "Entertainment"}},
        {"id": "mood_regret", "label": "Sentiment", "properties": {"status": "Regret"}}
      ],
      "edges": [
        {"source": "user_1", "target": "t_101", "relation": "MADE_TRANSACTION"},
        {"source": "t_101", "target": "cat_ent", "relation": "CATEGORIZED_AS"},
        {"source": "t_101", "target": "mood_regret", "relation": "HAS_SENTIMENT"}
      ]
    }
    ```
- `POST /api/memory/feedback`
  - **Payload**: `{ "transaction_id": 101, "sentiment": "Regret" }`
  - **Process**: Ingests emotion into Cognee via `remember()`, linking the transaction node to a `Regret` or `Happy` sentiment node, and adjusting graph weights using `improve()`.
