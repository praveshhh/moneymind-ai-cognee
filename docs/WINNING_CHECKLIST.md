# 🏆 WINNING CHECKLIST

## YOUR 4-DAY PLAN TO WIN BIG

---

## 📅 DAY 1: CSV IMPORT + TESTING (COMPLETED ✅)
*Working CSV import of transactions with sentiment scores into the database.*

- [x] Copy CSV import code to `backend/routes/transactions.py`
- [x] Copy upload button to `frontend/src/components/Dashboard.jsx`
- [x] Test backend at `http://localhost:8000/docs`
- [x] Verify upload button appears in frontend
- [x] Upload `frontend/sample_statement.csv`
- [x] Verify all transactions imported with sentiments (Happy/Neutral/Regret)

---

## 📅 DAY 2: MEMORY RECALL VISUALIZATION (COMPLETED ✅)
*Chat thinking path and SVG-based graph visualization loaded and working.*

- [x] Add thinking_path to chat response in `backend/routes/chat.py`
- [x] Update `frontend/src/components/AIChat.jsx` to display thinking path
- [x] Test chat shows expandable thinking path cards
- [x] Build `frontend/src/components/GraphVisualizer.jsx`
- [x] Test `/api/chat/graph` endpoint returns nodes
- [x] Verify graph displays without crashing

---

## 📅 DAY 3: CASHFLOW + POLISH (COMPLETED ✅)
*Affordability analysis and upcoming bills warning integrations completed.*

- [x] Add `/analyze-purchase` endpoint to `backend/routes/chat.py`
- [x] Test endpoint with sample purchase request
- [x] Integrate cashflow analysis into chat response
- [x] Test warning message appears for risky purchases
- [x] UI polish (consistent green accents, dark background)

---

## 📅 DAY 4: PRESENTATION (READY TO EXECUTE 🎬)
*Pitch and video demonstration preparation.*

- [ ] Memorize QUICK_REFERENCE talking points (30 min)
- [ ] Practice 2-minute demo pitch out-loud (30 min)
- [ ] Record demo video (Open app, upload CSV, ask PS5 question, show thinking path & graph, close)
- [ ] Save as `demo_video.mp4` in project root

---

## 🧪 TESTING FLOWS TO RUN BEFORE DEMO

- [x] **Flow 1: CSV Import**: Click upload -> select CSV -> transactions appear -> sentiments saved.
- [x] **Flow 2: Chat & Thinking Path**: Ask "Can I buy a PlayStation 5 for $8000?" -> response shows within 2 seconds -> expandable thinking path matches past regrets and upcoming bills.
- [x] **Flow 3: Graph Visualization**: Graph shows 5+ nodes colored by type -> clicking a node shows details modal without crashing.
- [x] **Flow 4: Cashflow Warning**: Ask about expensive purchase -> response warns about upcoming bills/rent if balance is insufficient.
