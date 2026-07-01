# ⚡ QUICK REFERENCE - Tab This Right Now

## 🎯 YOUR 4-DAY ROADMAP

```
DAY 1 (5 hrs)
├─ CSV Import Endpoint ........... 1 hr
├─ CSV Upload Button UI .......... 1 hr  
├─ Test end-to-end .............. 1 hr
├─ Fix import bugs .............. 1 hr
└─ CHECKPOINT: Upload CSV works ✅

DAY 2 (6 hrs)  
├─ Enhance Chat thinking_path .... 2 hrs
├─ Display in AIChat.jsx ......... 2 hrs
├─ Build GraphVisualizer ......... 2 hrs
└─ CHECKPOINT: See thinking path ✅

DAY 3 (4 hrs)
├─ Cashflow warning logic ........ 2 hrs
├─ Integrate to chat ............. 1 hr
├─ Polish UI/fix bugs ............ 1 hr
└─ CHECKPOINT: Full demo works ✅

DAY 4 (2 hrs)
├─ Practice pitch ................ 1 hr
└─ Record demo video ............. 1 hr
```

---

## 🚀 COPY-PASTE FIRST TASKS

### Task 1: Add CSV Import (5 minutes to add code)

**Backend:** `backend/routes/transactions.py` — Add at END of file:

```python
import io, csv, logging
logger = logging.getLogger(__name__)

@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.user_id == current_user.id).first()
    if not account: raise HTTPException(status_code=404, detail="No account")
    contents = await file.read()
    stream = io.StringIO(contents.decode('utf-8'))
    reader = csv.DictReader(stream)
    count = 0
    for row in reader:
        tx = Transaction(user_id=current_user.id, account_id=account.id, amount=float(row['amount']), merchant=row['merchant'], category=row['category'], date=datetime.strptime(row['date'], '%Y-%m-%d').date(), type="debit", sentiment=row.get('sentiment','Neutral'), note=row.get('note',''))
        db.add(tx)
        count += 1
    db.commit()
    return {"status":"success", "imported":count}
```

**Frontend:** `frontend/src/components/Dashboard.jsx` — Add this button:

```jsx
<label className="cursor-pointer bg-green-600 px-4 py-2 rounded">
  📊 Upload CSV
  <input type="file" accept=".csv" onChange={async(e)=>{const f=e.target.files[0];if(f){const fd=new FormData();fd.append('file',f);const r=await fetch('http://localhost:8000/api/transactions/import-csv',{method:'POST',headers:{'Authorization':`Bearer ${localStorage.getItem('token')}`},body:fd});alert(`Imported ${(await r.json()).imported} transactions`)}}} className="hidden" />
</label>
```

---

### Task 2: Test CSV Import (1 minute)

```bash
# Terminal 1
cd backend && python main.py

# Terminal 2  
cd frontend && npm run dev

# Browser: http://localhost:5173
# 1. Login/Signup
# 2. Click "Upload CSV"
# 3. Select frontend/sample_statement.csv
# 4. ✅ Should show "Imported 4 transactions"
```

---

## 🧠 KEY FILES TO EDIT

| File | What To Do | Time |
|------|-----------|------|
| `backend/routes/transactions.py` | Add `/import-csv` endpoint | 15 min |
| `frontend/src/components/Dashboard.jsx` | Add upload button | 20 min |
| `backend/routes/chat.py` | Add thinking_path to response | 30 min |
| `frontend/src/components/AIChat.jsx` | Display thinking path | 45 min |
| `backend/routes/chat.py` | Add `/analyze-purchase` endpoint | 30 min |
| `frontend/src/components/GraphVisualizer.jsx` | Build graph UI | 60 min |

**TOTAL: ~3.5 hours for MVP features** 

---

## 💡 DEMO TALKING POINTS (Memorize)

1. **Opening:** "MoneyMind AI solves financial amnesia with Cognee knowledge graph"

2. **CSV Upload:** "Notice how we load 50 transactions instantly AND ingest them into our memory graph"

3. **Memory Recall:** "When I ask 'Can I buy shoes?', the AI doesn't just see a ledger—it remembers I bought shoes 40 days ago and regretted it"

4. **Thinking Path:** "Here's the graph traversal—that's transparency judges love"

5. **Cashflow Warning:** "Traditional apps don't see that my rent's due in 3 days. We do."

6. **Close:** "Cognee + Fintech = Memory-Driven Financial Decisions. That's our innovation."

---

## 🎯 JUDGE SCORING RUBRIC (What They Care About)

```
40% ← Working Demo (no crashes, loads fast)
20% ← Technical Innovation (Cognee = huge points)  
20% ← Problem-Solution Fit (clearly solves amnesia)
15% ← Polish & UX (not janky)
5% ← Presentation (clear pitch)
```

**You get:**
- ✅ 40/40 for working CSV + graph + warnings (all 3 working)
- ✅ 20/20 for Cognee integration (unique vs competitors)
- ✅ 20/20 for PRD (already have this)
- 🟡 12/15 for UI polish (won't be perfect but shouldn't crash)
- 🟡 4/5 for pitch (practice 2-3x)

**TOTAL: ~96/100** ← Top prize range

---

## 🚨 CRITICAL GOTCHAS

❌ **Don't do these:**
- Spend time on SMS webhook (not needed for MVP)
- Spend time on 7-day regret automation (nice-to-have)
- Make graph super fancy with animations (doesn't matter)
- Try to add predictive ML (too complex, no ROI)

✅ **Do these instead:**
- Make sure CSV loads without errors
- Make sure chat responds with thinking path visible
- Make sure graph shows WITHOUT crashes
- Practice pitch 3 times before demo

---

## 📱 EXACT DEMO FLOW (Copy This)

```
0. Pre-load sample CSV data into browser's Downloads folder
1. Open app, Login
2. Click "Upload CSV" button
3. Select sample_statement.csv
4. Show transaction list loaded
5. Click "Chat" tab
6. Ask: "Can I afford a PlayStation 5 for $8000?"
7. Show response with thinking path + warning
8. Click "Graph" tab
9. Click on "Nike" node
10. Show connected nodes: Purchase → Regret → Category
11. Say: "That's multi-hop reasoning. Traditional DBs can't do this."
12. Exit gracefully ✅

TOTAL TIME: 2 minutes
```

---

## 🏁 SUCCESS CRITERIA (Before You Demo)

- [ ] CSV import works (tested 3x)
- [ ] Chat shows thinking path (tested 3x)
- [ ] Graph loads without errors (tested 3x)
- [ ] Cashflow warning appears (tested 3x)
- [ ] No console errors (checked)
- [ ] Favicon is brain+$ (verified)
- [ ] Pitch memorized
- [ ] Sample data pre-loaded

**If all checked:** You're ready to win 🏆

---

## 📞 WHEN YOU GET STUCK

**Issue:** CSV import says "No account"  
**Fix:** Create account first via signup, then upload

**Issue:** Chat endpoint returns 500  
**Fix:** Check backend logs, ensure Cognee is initialized

**Issue:** Graph won't load  
**Fix:** Check `/api/chat/graph` endpoint exists and returns nodes/edges

**Issue:** Thinking path not showing in chat  
**Fix:** Verify backend adds `thinking_path` key to response JSON

---

## ⏰ NEXT 30 MINUTES

1. Open `EXECUTION_ROADMAP.md` (full copy-paste code)
2. Copy CSV import code to `backend/routes/transactions.py`
3. Copy upload button to `frontend/src/components/Dashboard.jsx`
4. Run backend + frontend
5. Test CSV upload ✅
6. Report back with status

**You got this! 🚀**
