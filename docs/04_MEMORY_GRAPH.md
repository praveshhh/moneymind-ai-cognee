# Cognee Memory Graph Specification - MoneyMind AI

This document specifies the structure of the **Cognee Knowledge Graph** representing the user's financial memory. Cognee constructs this graph from unstructured data (chat transcripts, notes, SMS text) and structured objects (transactions, commitments).

---

## 1. Graph Ontology (Nodes and Edges)

```
        [User]
          |
          +----(HAS_GOAL)-----> [Goal]
          |
          +----(HAS_OBLIGATION)-----> [Obligation] (SIP, Rent)
          |
          +----(MADE_TRANSACTION)-----> [Transaction]
                                            |
                                            +---(SPENT_AT)-----> [Merchant] (e.g., Amazon)
                                            |
                                            +---(BELONGS_TO)---> [Category] (e.g., Shopping)
                                            |
                                            +---(HAS_EMOTION)---> [Sentiment] (e.g., Regret)
                                            |
                                 (OCCURRED_BEFORE) [Temporal Edge]
                                            |
                                            v
                                     [Transaction]
```

### 1.1 Node Definitions

1. **`User`**: Represents the actor.
   - *Properties*: `username`
2. **`Transaction`**: Represents an individual spending event.
   - *Properties*: `transaction_id`, `amount`, `date`, `description`
3. **`Merchant`**: The retail entity.
   - *Properties*: `name`
4. **`Category`**: The spending categorization.
   - *Properties*: `name`, `is_discretionary`
5. **`Sentiment`**: The user's post-purchase emotional response.
   - *Properties*: `rating` (`Happy`, `Neutral`, `Regret`), `recorded_at`
6. **`Obligation`**: Future recurring commitments.
   - *Properties*: `name`, `amount`, `due_date`, `interval`
7. **`Goal`**: Financial targets.
   - *Properties*: `name`, `target_amount`, `target_date`

### 1.2 Edge Definitions

1. **`MADE_TRANSACTION`**: Connects `User` to `Transaction`.
2. **`SPENT_AT`**: Connects `Transaction` to `Merchant`.
3. **`BELONGS_TO`**: Connects `Transaction` to `Category`.
4. **`HAS_EMOTION`**: Connects `Transaction` to `Sentiment` (crucial for behavioral memory).
5. **`OCCURRED_BEFORE`**: A temporal link connecting sequential transactions, allowing the system to detect sequence patterns (e.g., "Dining out usually precedes a late-night ride sharing expense").
6. **`HAS_OBLIGATION`**: Connects `User` to `Obligation`.
7. **`HAS_GOAL`**: Connects `User` to `Goal`.

---

## 2. Cognee Structured Extraction & Ingestion

In Cognee, structured memory graphs are defined using standard **Pydantic models**. When a Pydantic object is sent to `cognee.remember()`, the engine automatically parses it into nodes and edges.

### 2.1 Pydantic Memory Schemas

We will define the following Cognee schemas in Python:

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class Merchant(BaseModel):
    name: str

class Category(BaseModel):
    name: str
    is_discretionary: bool = True

class Sentiment(BaseModel):
    rating: str  # "Happy", "Neutral", "Regret"
    notes: Optional[str] = None

class TransactionMemory(BaseModel):
    transaction_id: int
    amount: float
    date: str
    description: str
    merchant: Merchant
    category: Category
    sentiment: Optional[Sentiment] = None

class ObligationMemory(BaseModel):
    name: str
    amount: float
    due_date: str
    interval: str  # "monthly", "yearly"

class GoalMemory(BaseModel):
    name: str
    target_amount: float
    target_date: str
```

### 2.2 Reasoning Traversals (Multi-Hop Search)

When a user asks: *"Can I buy a PlayStation 5 for $499 today?"*, Cognee traverses the graph:

1. **Hop 1: Category / Merchant Query**: Find past transactions belonging to `Category: Gaming` or `Merchant: Sony`.
2. **Hop 2: Sentiment Check**: Traverse from past matching transactions to their connected `Sentiment` nodes. Look for nodes with `rating: "Regret"`.
3. **Hop 3: Obligation Threat Assessment**: Fetch `Obligation` nodes and check their due dates. Calculate the remaining cash flow after the potential $499 purchase is subtracted.
4. **Hop 4: Goal Alignment**: Check `Goal` nodes to see if this discretionary purchase delays the target date.
