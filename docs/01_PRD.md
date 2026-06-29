# Product Requirement Document (PRD) - MoneyMind AI

## 1. Executive Summary
MoneyMind AI is a **Cognee-powered AI Financial Memory Operating System**. Traditional personal finance apps store static transaction ledgers but lack context, memory, and reasoning. They don't remember that a user regretted an impulse buy, that a utility bill is due tomorrow, or that a user's savings goal is falling behind. MoneyMind AI solves this "financial amnesia" by converting transactions, emotions, commitments, and feedback into a **dynamic hybrid knowledge graph** using Cognee. The result is an agent that understands the *why* behind your money and helps you make memory-informed choices.

---

## 2. Problem Statement
1. **Context Isolation (Amnesia)**: Every time a user opens a budgeting app, it starts from scratch. It doesn't remember conversational advice, prior goals, or behavioral traps.
2. **Lack of Relational Mapping**: Databases see a $700 Swiggy charge and a $1200 electric bill as two rows in a table. They do not relate that spending on Swiggy occurred *before* the electricity bill, causing the user to delay payment.
3. **No Emotional Memory**: Financial decisions are highly emotional. Apps don't track how a user felt after a purchase, failing to help them avoid repeating regrettable spending.

---

## 3. The Solution: Cognee-Powered Memory
MoneyMind AI leverages Cognee's four core operations:
* **`remember()`**: Every financial event (transaction, subscription, SIP, user budget, sentiment) is ingested. Cognee extracts semantic entities (e.g., "Amazon", "Electronics", "Impulse Buy") and links them dynamically.
* **`recall()`**: When a user queries the agent ("Can I afford to buy sports shoes?"), the agent retrieves multi-hop context (e.g., "You bought sports shoes 40 days ago, regretted it, and missed your savings target").
* **`improve()`**: The graph prunes obsolete nodes and adjusts relation weights over time based on user feedback.
* **`forget()`**: Outdated information (e.g., canceled subscriptions or paid-off loans) is pruned to keep the agent's context clean and accurate.

---

## 4. Key Features

### Feature 1: Multi-Source Transaction Ingest
- **Manual Input**: Quick entry of transactions with an emotional rating (🙂 Yes, 😐 Maybe, 🙁 No).
- **CSV Ingestion**: Upload bank statement exports (support standard format) to bulk-populate history.
- **Mock SMS Ingestion**: Webhook simulating real-time SMS notifications ("Spent INR 5,000 at Apple Store via UPI").

### Feature 2: Memory-Driven AI Chat ("Financial Brain")
- Natural language interface where users can ask complex questions.
- Exposes the agent's **Thinking Path** (showing what Cognee memories were recalled and how the graph was traversed).
- Proactively warns against impulse buys by connecting them to future commitments (rent, insurance, SIP).

### Feature 3: Interactive Cognee Graph Visualizer
- A visual node-link interface in the dashboard.
- Displays Cognee nodes (User, Transaction, Merchant, Category, Sentiment, Budget) and their edges.
- Allows users to click nodes and see details (e.g., the chain: `Amazon -> Shopping -> Impulse Buy -> Regretted`).

### Feature 4: Financial Time Machine & Predictions
- Simulates future cashflow up to 45 days based on recurring commitments (SIPs, bills, rents) and historical patterns.
- Answers: "If I buy this item today, what will my balance look like next month?"

### Feature 5: Emotion-Regret Feedback Loop
- Asks the user 7 days after an expensive purchase: "Was this purchase worth it?"
- Ingests the answer into Cognee.
- Learns to discourage purchases at merchants/categories that have a high "Regret Rate."

---

## 5. User Stories & Acceptance Criteria

### User Story A: Recommending Against Regrettable Actions
* **As a** user,
* **I want** the AI to warn me when I'm about to buy something that matches my past regret patterns,
* **So that** I don't repeat financial mistakes.
* **Acceptance Criteria**:
  - The system must query Cognee for categories/merchants associated with `Sentiment: Regret`.
  - If a user asks about buying from that category/merchant, the AI must mention the past regretted event.

### User Story B: Cashflow Protection
* **As a** user,
* **I want** the AI to check my upcoming bills before telling me if I can afford an item,
* **So that** I don't default on obligations.
* **Acceptance Criteria**:
  - Cognee must store recurring obligations (Rent, SIPs, Utilities) with their schedules.
  - The reasoning agent must recall these obligations and check if the purchase will drop the projected balance below the obligation threshold.

---

## 6. Technical Stack
- **Backend Framework**: Python 3.13 + FastAPI
- **Memory Engine**: Cognee (SQLite/LanceDB/Kuzu)
- **Metadata Database**: SQLAlchemy + SQLite
- **LLM/Embeddings**: Google Gemini / OpenAI
- **Frontend Client**: Vite + React + Tailwind CSS + Recharts + React Flow (or vis.js) for Graph Visualizer
