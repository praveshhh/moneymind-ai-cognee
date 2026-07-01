# 🚀 EXECUTION ROADMAP - Copy & Paste Ready

## Phase 1: CSV Import (90 minutes) ⏱️

### Step 1.1: Add CSV Import Endpoint

**File:** `backend/routes/transactions.py`

Add this to the end of the file:

```python
import io
import logging

logger = logging.getLogger(__name__)

@router.post("/import-csv")
async def import_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import transactions from CSV file.
    Expected columns: date, merchant, category, amount, sentiment, note
    """
    try:
        # Get user's first account (for demo purposes)
        account = db.query(Account).filter(Account.user_id == current_user.id).first()
        if not account:
            raise HTTPException(status_code=404, detail="No account found. Create one first.")
        
        # Read CSV
        contents = await file.read()
        stream = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(stream)
        
        imported_count = 0
        errors = []
        
        for row_num, row in enumerate(reader, start=2):
            try:
                # Parse date
                tx_date = datetime.strptime(row['date'], '%Y-%m-%d').date()
                
                # Create transaction
                new_tx = Transaction(
                    user_id=current_user.id,
                    account_id=account.id,
                    amount=float(row['amount']),
                    merchant=row['merchant'],
                    category=row['category'],
                    date=tx_date,
                    type="debit" if float(row['amount']) > 0 else "credit",
                    sentiment=row.get('sentiment', 'Neutral'),
                    note=row.get('note', '')
                )
                
                db.add(new_tx)
                
                # Also ingest into Cognee memory
                await remember_transaction(
                    user_id=current_user.id,
                    amount=float(row['amount']),
                    merchant=row['merchant'],
                    category=row['category'],
                    date_str=row['date'],
                    sentiment=row.get('sentiment', 'Neutral'),
                    note=row.get('note', '')
                )
                
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                logger.error(f"Error importing row {row_num}: {str(e)}")
        
        # Commit all transactions
        db.commit()
        
        return {
            "status": "success",
            "imported": imported_count,
            "errors": errors,
            "message": f"Successfully imported {imported_count} transactions"
        }
        
    except Exception as e:
        logger.error(f"CSV import error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")
```

---

### Step 1.2: Update Frontend - Add Upload Button

**File:** `frontend/src/components/Dashboard.jsx`

Add this button in your main component:

```jsx
import { Upload } from 'lucide-react';
import { useState } from 'react';

export default function Dashboard() {
  const [uploading, setUploading] = useState(false);
  
  const handleCSVUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:8000/api/transactions/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });
      
      const result = await response.json();
      alert(`✅ Imported ${result.imported} transactions!`);
      window.location.reload(); // Refresh to see new transactions
    } catch (error) {
      alert(`❌ Import failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      {/* CSV Import Card */}
      <div className="bg-gray-800 p-6 rounded-lg mb-6 border border-green-600">
        <h3 className="text-xl font-bold mb-4 text-green-400">📊 Import Bank Statement</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <Upload size={20} />
          <span>{uploading ? 'Uploading...' : 'Click to upload CSV'}</span>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleCSVUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        <p className="text-sm text-gray-400 mt-2">Format: date, merchant, category, amount, sentiment, note</p>
      </div>
      
      {/* Rest of your dashboard... */}
    </div>
  );
}
```

---

### Step 1.3: Test CSV Import

```bash
# Terminal 1: Start backend
cd backend
python main.py

# Terminal 2: Start frontend  
cd frontend
npm run dev
```

Then:
1. Go to `http://localhost:5173`
2. Login or signup
3. Click "Click to upload CSV"
4. Select `frontend/sample_statement.csv`
5. ✅ Should import 4 transactions

---

## Phase 2: Memory Recall Visualization (120 minutes)

### Step 2.1: Enhance Chat Response with Thinking Path

**File:** `backend/routes/chat.py`

Find this section:
```python
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
```

Replace it with:

```python
@router.post("/")
async def chat_with_advisor(
    req: ChatRequest, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    try:
        # Run the reasoning engine
        result = await analyze_purchase_request(db, current_user.id, req.message)
        
        # Add thinking path for transparency
        thinking_path = []
        
        # Check past regrets
        regret_txs = db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.sentiment == "Regret"
        ).all()
        
        if regret_txs:
            thinking_path.append({
                "step": 1,
                "category": "Memory Recall",
                "type": "Past Regrets",
                "count": len(regret_txs),
                "nodes": [
                    {
                        "id": f"regret_{t.id}",
                        "label": f"{t.merchant} - ${t.amount}",
                        "timestamp": str(t.date),
                        "sentiment": t.sentiment
                    }
                    for t in regret_txs[:3]  # Show top 3
                ]
            })
        
        # Check upcoming bills
        upcoming_bills = db.query(Bill).filter(
            Bill.user_id == current_user.id
        ).all()
        
        if upcoming_bills:
            thinking_path.append({
                "step": 2,
                "category": "Obligation Check",
                "type": "Upcoming Bills",
                "count": len(upcoming_bills),
                "nodes": [
                    {
                        "id": f"bill_{b.id}",
                        "label": f"{b.name} - ${b.amount}",
                        "due_date": str(b.due_date)
                    }
                    for b in upcoming_bills
                ]
            })
        
        # Add thinking path to response
        result["thinking_path"] = thinking_path
        result["analysis_depth"] = len(thinking_path)
        
        return result
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

### Step 2.2: Display Thinking Path in Frontend

**File:** `frontend/src/components/AIChat.jsx`

Update the chat display:

```jsx
export default function AIChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const newMessage = { role: 'user', content: input };
    setMessages([...messages, newMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      // Add AI response with thinking path
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        thinking_path: data.thinking_path,
        confidence: data.confidence
      }]);

    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs p-3 rounded-lg ${
              msg.role === 'user' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-800 text-gray-200'
            }`}>
              <p>{msg.content}</p>
              
              {/* Show thinking path for AI responses */}
              {msg.thinking_path && msg.thinking_path.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-600 text-xs">
                  <p className="font-semibold text-green-400 mb-2">🧠 Thinking Path:</p>
                  {msg.thinking_path.map((step, j) => (
                    <div key={j} className="mb-2 p-2 bg-gray-700 rounded">
                      <p className="font-bold">{step.step}. {step.category}</p>
                      <p className="text-gray-300">{step.type} ({step.count})</p>
                      {step.nodes && (
                        <ul className="mt-1 text-xs">
                          {step.nodes.map((node, k) => (
                            <li key={k} className="text-green-300">• {node.label}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {msg.confidence && (
                <p className="text-xs text-gray-400 mt-2">
                  Confidence: {Math.round(msg.confidence * 100)}%
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && <p className="text-gray-400">Thinking...</p>}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask MoneyMind AI..."
            className="flex-1 bg-gray-800 text-white p-3 rounded border border-gray-600"
            disabled={loading}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white p-3 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Phase 3: Graph Visualization (180 minutes)

### Step 3.1: Seed Demo Data

**File:** `backend/db_init.py`

Add this function:

```python
async def seed_demo_graph(user_id: int, db: Session):
    """Seed demo transactions for graph visualization"""
    from datetime import datetime, timedelta
    
    demo_data = [
        {
            "merchant": "Nike Store",
            "category": "Shopping",
            "amount": 8500,
            "sentiment": "Regret",
            "date": datetime.now() - timedelta(days=40),
            "note": "Impulse sneaker purchase"
        },
        {
            "merchant": "Amazon Electronics",
            "category": "Shopping",
            "amount": 15000,
            "sentiment": "Regret",
            "date": datetime.now() - timedelta(days=25),
            "note": "Laptop impulse buy (used once)"
        },
        {
            "merchant": "Zomato Food",
            "category": "Food",
            "amount": 2500,
            "sentiment": "Happy",
            "date": datetime.now() - timedelta(days=5),
            "note": "Celebration dinner with friends"
        },
        {
            "merchant": "Rent Payment",
            "category": "Utilities",
            "amount": 15000,
            "sentiment": "Neutral",
            "date": datetime.now() - timedelta(days=2),
            "note": "Monthly rent"
        },
        {
            "merchant": "Netflix Subscription",
            "category": "Subscriptions",
            "amount": 199,
            "sentiment": "Neutral",
            "date": datetime.now() - timedelta(days=1),
            "note": "Recurring monthly"
        }
    ]
    
    account = db.query(Account).filter(Account.user_id == user_id).first()
    if not account:
        return
    
    for data in demo_data:
        tx = Transaction(
            user_id=user_id,
            account_id=account.id,
            merchant=data["merchant"],
            category=data["category"],
            amount=data["amount"],
            sentiment=data["sentiment"],
            date=data["date"].date(),
            type="debit",
            note=data["note"]
        )
        db.add(tx)
    
    db.commit()
```

---

### Step 3.2: Build GraphVisualizer Component

**File:** `frontend/src/components/GraphVisualizer.jsx`

```jsx
import { useEffect, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';

export default function GraphVisualizer() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGraph();
  }, []);

  const fetchGraph = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/chat/graph', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (error) {
      console.error('Failed to load graph:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6 text-white">Loading graph...</div>;

  // Group nodes by type
  const nodesByType = nodes.reduce((acc, node) => {
    if (!acc[node.type]) acc[node.type] = [];
    acc[node.type].push(node);
    return acc;
  }, {});

  const getColor = (type) => {
    const colors = {
      'Transaction': '#10b981',
      'Merchant': '#3b82f6',
      'Category': '#f59e0b',
      'Sentiment': '#ef4444',
      'User': '#8b5cf6',
      'Budget': '#06b6d4'
    };
    return colors[type] || '#6b7280';
  };

  return (
    <div className="w-full h-full bg-gray-900 text-white p-6 overflow-auto">
      <h2 className="text-2xl font-bold mb-6 text-green-400">🧠 Memory Graph</h2>
      
      {/* Legend */}
      <div className="flex gap-4 mb-6 flex-wrap">
        {Object.keys(nodesByType).map(type => (
          <div key={type} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getColor(type) }}
            />
            <span className="text-sm">{type} ({nodesByType[type].length})</span>
          </div>
        ))}
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {nodes.map(node => (
          <div
            key={node.id}
            onClick={() => setSelectedNode(node)}
            className="p-4 rounded-lg cursor-pointer border-2 transition-all hover:scale-105"
            style={{
              backgroundColor: `${getColor(node.type)}15`,
              borderColor: getColor(node.type)
            }}
          >
            <p className="text-xs text-gray-400 mb-1">{node.type}</p>
            <p className="font-bold text-sm truncate">{node.label}</p>
            <p className="text-xs text-gray-400 mt-1">{node.value}</p>
          </div>
        ))}
      </div>

      {/* Node Details Modal */}
      {selectedNode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-green-400">{selectedNode.label}</h3>
              <button onClick={() => setSelectedNode(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className="font-semibold">{selectedNode.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Value</p>
                <p className="font-semibold">{selectedNode.value}</p>
              </div>
              
              {/* Show related edges */}
              {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Connected To:</p>
                  <ul className="space-y-1">
                    {edges.filter(e => e.source === selectedNode.id || e.target === selectedNode.id).map((edge, i) => {
                      const relatedId = edge.source === selectedNode.id ? edge.target : edge.source;
                      const relatedNode = nodes.find(n => n.id === relatedId);
                      return (
                        <li key={i} className="text-sm text-blue-400">
                          → {relatedNode?.label} ({edge.label})
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setSelectedNode(null)}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Phase 4: Cashflow Warning Logic (120 minutes)

### Step 4.1: Add Cashflow Analysis Endpoint

**File:** `backend/routes/chat.py`

Add this new endpoint:

```python
class PurchaseAnalysisRequest(BaseModel):
    amount: float
    merchant: str
    category: str

@router.post("/analyze-purchase")
async def analyze_purchase(
    req: PurchaseAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze if a purchase is safe given upcoming bills"""
    
    # Get current balance
    account = db.query(Account).filter(Account.user_id == current_user.id).first()
    current_balance = account.balance if account else 0
    
    # Get total of all transactions (for simulation)
    total_spent = db.query(func.sum(Transaction.amount)).filter(
        Transaction.user_id == current_user.id
    ).scalar() or 0
    
    # Get upcoming bills (next 30 days)
    upcoming_bills = db.query(Bill).filter(
        Bill.user_id == current_user.id
    ).all()
    
    total_obligations = sum(b.amount for b in upcoming_bills)
    
    # Simulate balance after purchase
    projected_balance = current_balance - req.amount
    safe_threshold = 500  # Minimum safe balance
    
    # Check for regret patterns in same category
    past_regrets = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
        Transaction.category == req.category,
        Transaction.sentiment == "Regret"
    ).all()
    
    regret_rate = len(past_regrets) / max(1, len([
        t for t in db.query(Transaction).filter(
            Transaction.user_id == current_user.id,
            Transaction.category == req.category
        ).all()
    ])) if past_regrets else 0
    
    # Generate warning message
    warnings = []
    is_safe = True
    
    if regret_rate > 0.5:
        warnings.append(f"⚠️ Pattern Alert: You regret {int(regret_rate*100)}% of {req.category} purchases")
        is_safe = False
    
    if projected_balance < (total_obligations + safe_threshold):
        warnings.append(f"💸 Cashflow Risk: After purchase, balance would be ${projected_balance:.0f} but you have ${total_obligations:.0f} in bills due soon")
        is_safe = False
    
    if projected_balance < 0:
        warnings.append(f"🚨 CRITICAL: You'd go negative by ${abs(projected_balance):.0f}")
        is_safe = False
    
    return {
        "merchant": req.merchant,
        "amount": req.amount,
        "current_balance": current_balance,
        "projected_balance": projected_balance,
        "upcoming_obligations": total_obligations,
        "regret_rate": regret_rate,
        "is_safe": is_safe,
        "warnings": warnings,
        "recommendation": "✅ Safe to purchase" if is_safe else "❌ Not recommended",
        "confidence": 0.85
    }
```

---

### Step 4.2: Integrate into Chat

Update `@router.post("/")` in chat.py to call this:

```python
# In analyze_purchase_request function or in chat endpoint:
analysis = await analyze_purchase(PurchaseAnalysisRequest(...))
result["warnings"] = analysis["warnings"]
result["cashflow_status"] = analysis
```

---

## ✅ QUICK CHECKLIST

**Before Demo:**
- [ ] CSV import working (test with sample_statement.csv)
- [ ] Chat shows thinking path with past regrets
- [ ] Graph visualizer loads and shows nodes
- [ ] Cashflow warnings appear when user asks about purchase
- [ ] No console errors
- [ ] Favicon shows brain + $ symbol
- [ ] Demo data is pre-seeded

**Test Flow (2 minutes):**
1. Upload CSV → See 4+ transactions
2. Ask "Can I afford a PlayStation 5?"
3. See thinking path + cashflow warning
4. Click graph nodes to explore relationships

---

## 🎬 DEMO SCRIPT TO MEMORIZE

```
"MoneyMind AI fixes financial amnesia using Cognee.

[Upload CSV]
Here's my last month of spending. 50 transactions loaded in seconds.

[Ask AI]
'Can I buy a PlayStation 5 for $8000?'

Notice three things:
1. Thinking Path - shows what memories we retrieved
2. Regret Pattern - I bought electronics twice, regretted both (50% regret rate)
3. Cashflow Warning - rent is due in 3 days, I'll be short $2000

Traditional apps miss these connections. We don't.

That's the Cognee difference."

TIME: 90 seconds
```

---

**Ready to start?** Do Phase 1 first (90 min). Let me know when you hit any blockers!
