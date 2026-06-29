# MoneyMind AI - Cognee-Powered Financial Memory Assistant

MoneyMind AI is a memory-native financial brain assistant designed for the **"Hangover: Where's My Context?" Hackathon**. It uses **Cognee** to build a dynamic, temporal knowledge graph of financial concepts, helping users make better, memory-aware financial choices instead of relying on plain expense lists.

---

## 🚀 Key Advantages of Cognee's Memory
Most personal finance apps suffer from "financial amnesia" – each interaction starts from scratch, forgetting user behaviors, emotions, and commitments. MoneyMind AI solves this by translating transactions, emotions, commitments, and feedback into a **dynamic hybrid knowledge graph** using Cognee's four core operations:
* **`remember()`**: Ingests transactions, obligations, and sentiment feedback to build connection nodes.
* **`recall()`**: Traces multi-hop context (e.g. connecting a purchase query to upcoming bills and past regretted actions).
* **`improve()`**: Consolidates caches and prunes obsolete relations.
* **`forget()`**: Clears or deletes outdated information.

---

## 🛠️ Tech Stack
- **Backend**: Python 3.13 + FastAPI + SQLAlchemy + SQLite
- **Memory Engine**: Cognee (SQLite + LanceDB + Kuzu)
- **LLM/Embeddings**: OpenAI or Google Gemini (via direct HTTP wrapper)
- **Frontend**: Vite + React + Tailwind CSS + Recharts + React SVG Visualizer

---

## 📂 Project Structure
```
MoneyMind/
├── docs/
│   ├── 01_PRD.md             # Product requirements and user stories
│   ├── 02_SYSTEM_DESIGN.md   # Modular backend block diagram & API Spec
│   ├── 03_DATABASE.md        # Relational SQL schemas
│   └── 04_MEMORY_GRAPH.md    # Cognee node-edge graph ontology
├── backend/
│   ├── main.py               # FastAPI entrypoint and CORS mapping
│   ├── config.py             # Environment variables mapping for LiteLLM
│   ├── db_setup.py           # SQLAlchemy database tables configuration
│   ├── db_init.py            # SQLite table initialization & seeding script
│   ├── agent/
│   │   └── financial_agent.py# Affordability LLM reasoner
│   ├── services/
│   │   └── memory_service.py # Cognee SDK remember/recall wrappers
│   ├── routes/
│   │   └── auth/transactions/budgets/goals/bills/chat.py # Endpoint routes
│   └── tests/
│       ├── test_api.py       # Automated endpoint test suite
│       └── test_cognee_integration.py # Ingestion pipeline verification
└── frontend/
    ├── src/
    │   ├── App.jsx           # Main container layout
    │   ├── index.css         # Tailwind directives & glassmorphism filters
    │   └── components/
    │       ├── Dashboard.jsx # Cards, logs form, CSV imports & mock SMS
    │       ├── AIChat.jsx    # Console showing Cognee's Thinking Path
    │       └── GraphVisualizer.jsx # Custom SVG memory graph renderer
    └── sample_statement.csv  # Mock bank statement CSV for uploads testing
```

---

## ⚙️ Quick Start

### 1. Configure the Environment
Create a `.env` file in the root directory:
```env
LLM_PROVIDER="openai" # options: openai, google_gemini
LLM_API_KEY="your-api-key-here"
LLM_MODEL="gpt-4o"
```

### 2. Set Up the Backend
```bash
# Set up virtual environment
python -m venv .venv
.venv\Scripts\activate # On Windows PowerShell: .venv\Scripts\Activate.ps1

# Install requirements
pip install -r backend/requirements.txt

# Seed the database
$env:PYTHONPATH="."
python backend/db_init.py

# Launch the FastAPI server
uvicorn backend.main:app --reload
```

### 3. Set Up the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. The application will automatically log you in as `demo` and load the seeded transactions.

---

## 🧪 Run Automated Tests
Verify your installation:
```bash
$env:PYTHONPATH="."
python backend/tests/test_api.py
```
