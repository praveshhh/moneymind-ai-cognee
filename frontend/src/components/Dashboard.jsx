import React, { useState, useEffect } from "react";
import axios from "axios";
import { Plus, Upload, MessageSquare, AlertTriangle, CheckCircle, Wallet, Goal, Calendar, Percent, ShieldAlert, Clock } from "lucide-react";

export default function Dashboard({ onTransactionAdded }) {
  // Database States
  const [accounts, setAccounts] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [user, setUser] = useState(null);
  const [transactions, setTransactions] = useState([]);

  // Forms States
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("Food");
  const [sentiment, setSentiment] = useState("Neutral");
  const [note, setNote] = useState("");
  const [accountId, setAccountId] = useState("");

  const [csvFile, setCsvFile] = useState(null);
  const [csvAccountId, setCsvAccountId] = useState("");

  const [smsText, setSmsText] = useState("");
  const [smsAccountId, setSmsAccountId] = useState("");

  const [btnLoading, setBtnLoading] = useState({ add: false, csv: false, sms: false });
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = "success") => {
    setNotification({ text: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [accRes, billRes, goalRes, budgRes, userRes, txRes] = await Promise.all([
        axios.get("http://localhost:8000/api/transactions/accounts", { headers }),
        axios.get("http://localhost:8000/api/bills", { headers }),
        axios.get("http://localhost:8000/api/goals", { headers }),
        axios.get("http://localhost:8000/api/budgets", { headers }),
        axios.get("http://localhost:8000/api/auth/me", { headers }),
        axios.get("http://localhost:8000/api/transactions?limit=10", { headers })
      ]);

      setBills(billRes.data);
      setGoals(goalRes.data);
      setBudgets(budgRes.data);
      setUser(userRes.data);
      setTransactions(txRes.data);

      const accountsList = accRes.data;
      setAccounts(accountsList);

      // Set default account forms selection
      if (accountsList.length > 0 && !accountId) {
        setAccountId(accountsList[0].id.toString());
        setCsvAccountId(accountsList[0].id.toString());
        setSmsAccountId(accountsList[0].id.toString());
      }
    } catch (e) {
      console.error("Failed to fetch dashboard data", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !merchant) return;
    setBtnLoading(prev => ({ ...prev, add: true }));

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8000/api/transactions", {
        account_id: parseInt(accountId),
        amount: parseFloat(amount),
        merchant,
        category,
        sentiment,
        note
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear Form
      setAmount("");
      setMerchant("");
      setNote("");
      setSentiment("Neutral");

      showNotification("Transaction logged and remembered by Cognee!");
      fetchData();
      if (onTransactionAdded) onTransactionAdded();
    } catch (err) {
      showNotification("Failed to add transaction", "error");
    } finally {
      setBtnLoading(prev => ({ ...prev, add: false }));
    }
  };

  const handleCsvUpload = async (e) => {
    e.preventDefault();
    if (!csvFile || !csvAccountId) return;
    setBtnLoading(prev => ({ ...prev, csv: true }));

    const formData = new FormData();
    formData.append("file", csvFile);
    formData.append("account_id", csvAccountId);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:8000/api/transactions/upload-csv", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      showNotification(res.data.message);
      fetchData();
      if (onTransactionAdded) onTransactionAdded();
    } catch (err) {
      showNotification("Failed to upload statement", "error");
    } finally {
      setBtnLoading(prev => ({ ...prev, csv: false }));
      setCsvFile(null);
    }
  };

  const handleSmsMock = async (e) => {
    e.preventDefault();
    if (!smsText) return;
    setBtnLoading(prev => ({ ...prev, sms: true }));

    const formData = new FormData();
    formData.append("sms_text", smsText);
    formData.append("account_id", smsAccountId);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:8000/api/transactions/mock-sms", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded"
        }
      });
      showNotification(`Ingested Rs. ${res.data.amount} at ${res.data.merchant}`);
      setSmsText("");
      fetchData();
      if (onTransactionAdded) onTransactionAdded();
    } catch (err) {
      showNotification("Failed to ingest SMS mock", "error");
    } finally {
      setBtnLoading(prev => ({ ...prev, sms: false }));
    }
  };

  // Calculations
  const checkingBal = accounts.filter(a => a.type === "checking" || a.type === "savings").reduce((sum, a) => sum + a.balance, 0);
  const creditDebt = accounts.find(a => a.type === "credit")?.balance || 0;
  const totalBills = bills.reduce((acc, curr) => acc + (curr.status === "Unpaid" ? curr.amount : 0), 0);
  const projectedSurplus = checkingBal - creditDebt - totalBills;

  // Health Score calculation (0 to 100)
  const healthScore = Math.max(0, Math.min(100, Math.round(
    ((checkingBal - creditDebt) > 0 ? 50 : 0) + 
    ((projectedSurplus > 5000) ? 30 : projectedSurplus > 0 ? 15 : 0) +
    (goals.length > 0 ? 20 : 0)
  )));

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-2 transition-all ${
          notification.type === "error" 
            ? "bg-danger/20 border-danger/40 text-danger-300"
            : "bg-primary/20 border-primary/40 text-primary-300"
        }`}>
          {notification.type === "error" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          <span className="text-xs font-semibold">{notification.text}</span>
        </div>
      )}

      {/* Grid: Assets Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Balance */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden glass-card-glow-green">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Cash & Savings</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">Rs. {checkingBal.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-gray-400 leading-normal">Money in HDFC, Kotak 811, and SBI (your "Liquidity").</span>
          </div>
        </div>

        {/* Card 2: Credit Card */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Credit Card Bills</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">Rs. {creditDebt.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-danger/10 rounded-xl border border-danger/20">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-gray-400 leading-normal">Money you owe on your ICICI credit card.</span>
          </div>
        </div>

        {/* Card 3: Upcoming Commitments */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden glass-card-glow-indigo">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Upcoming Bills</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">Rs. {totalBills.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <Calendar className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-gray-400 leading-normal">Rent, SIP, electricity, and subscriptions due soon.</span>
          </div>
        </div>

        {/* Card 4: Health Score */}
        <div className="glass-panel rounded-2xl p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Financial Health Score</span>
              <h2 className="text-2xl font-extrabold text-white mt-1">{healthScore}%</h2>
            </div>
            <div className="p-2.5 bg-accent/10 rounded-xl border border-accent/20">
              <Percent className="w-5 h-5 text-accent" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
            <div className="bg-accent h-1.5 rounded-full" style={{ width: `${healthScore}%` }} />
          </div>
        </div>
      </div>

      {/* Grid Layout: Ingestion Tools & Ledger & Commitments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Money Mind Control Panel (Ingestion) */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          {/* CSV/PDF Import */}
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-1">
              <Upload className="w-4 h-4 text-indigo-400" />
              Import Statement (CSV/PDF)
            </h3>
            <p className="text-[11px] text-gray-400">Bulk ingest bank statement entries into the memory graph</p>
            
            <form onSubmit={handleCsvUpload} className="space-y-3 mt-3">
              <select
                value={csvAccountId}
                onChange={(e) => setCsvAccountId(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              
              <input
                type="file"
                accept=".csv,.pdf"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-white hover:file:bg-gray-750"
                required
              />
              
              <button
                type="submit"
                disabled={btnLoading.csv || !csvFile}
                className="w-full bg-indigo-500 hover:bg-indigo-650 text-white font-bold p-2.5 rounded-lg text-xs transition"
              >
                {btnLoading.csv ? "Uploading & Graphifying..." : "Upload Bank Statement"}
              </button>
            </form>
          </div>

          {/* Remember Transaction Form */}
          <div className="border-t border-gray-800/80 pt-5">
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-1">
              <Plus className="w-4 h-4 text-primary" />
              Remember Transaction
            </h3>
            <p className="text-[11px] text-gray-400">Log a new purchase directly into the Cognee graph database</p>
            
            <form onSubmit={handleAddTransaction} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Amount (Rs)</label>
                  <input
                    type="number"
                    placeholder="e.g. 799"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Merchant</label>
                  <input
                    type="text"
                    placeholder="e.g. Netflix"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Food">Food</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="SIP">Investment / SIP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Sentiment</label>
                  <select
                    value={sentiment}
                    onChange={(e) => setSentiment(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                  >
                    <option value="Happy">🙂 Happy</option>
                    <option value="Neutral">😐 Neutral</option>
                    <option value="Regret">🙁 Regret</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-400 block mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Subscription"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={btnLoading.add}
                className="w-full bg-primary hover:bg-primary/95 text-background font-bold p-2.5 rounded-lg text-xs transition duration-200"
              >
                {btnLoading.add ? "Cognifying..." : "Remember Transaction"}
              </button>
            </form>
          </div>

          {/* SMS Webhook simulation */}
          <div className="border-t border-gray-800/80 pt-5">
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-accent" />
              Mock UPI/SMS Ingestion
            </h3>
            <p className="text-[11px] text-gray-400">Simulate a real-time incoming SMS transaction notification</p>
            
            <form onSubmit={handleSmsMock} className="space-y-3 mt-3">
              <select
                value={smsAccountId}
                onChange={(e) => setSmsAccountId(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <input
                type="text"
                placeholder="ALERT: Spent Rs. 1800 at Nike Shoes on Card xx123"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-lg p-2 text-xs text-white"
                required
              />

              <button
                type="submit"
                disabled={btnLoading.sms || !smsText}
                className="w-full bg-accent hover:bg-accent/90 text-background font-bold p-2.5 rounded-lg text-xs transition"
              >
                {btnLoading.sms ? "Parsing SMS..." : "Ingest Mock SMS"}
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Connected Bank Accounts & Recent Bank Ledger */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          {/* Accounts Breakdown */}
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4 text-primary" />
              Connected Bank Accounts
            </h3>
            <div className="space-y-2">
              {accounts.map(acc => {
                const isCredit = acc.type === "credit";
                return (
                  <div key={acc.id} className="bg-gray-900/40 border border-gray-800 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block">{acc.name}</span>
                      <span className="text-[10px] text-gray-500 capitalize">{acc.type} Account</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isCredit ? "text-danger-300" : "text-primary"}`}>
                        Rs. {acc.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Ingested Transactions Ledger */}
          <div className="border-t border-gray-800/80 pt-5">
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-indigo-400" />
              Recent Bank Ledger
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-xs">
                  No statement transactions found. Use the panel on the left to upload a statement.
                </div>
              ) : (
                transactions.slice(0, 10).map(tx => {
                  const isDebit = tx.amount > 0;
                  const isRegret = tx.sentiment === "Regret";
                  const isHappy = tx.sentiment === "Happy";
                  
                  return (
                    <div key={tx.id} className="bg-gray-900/30 border border-gray-800/50 rounded-xl p-2.5 flex justify-between items-center text-xs hover:border-gray-700/40 transition">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-semibold text-gray-200 block truncate">{tx.merchant}</span>
                        <span className="text-[9px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          {tx.date} • {tx.category}
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isRegret ? "bg-danger" : isHappy ? "bg-primary" : "bg-gray-600"
                          }`} title={`Sentiment: ${tx.sentiment}`} />
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold ${isDebit ? "text-gray-300" : "text-primary"}`}>
                          {isDebit ? "-" : "+"} Rs. {Math.abs(tx.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Column 3: Commitments & Goals Lists */}
        <div className="glass-panel rounded-2xl p-6 space-y-6">
          {/* Upcoming commitments */}
          <div>
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Future Commitments
            </h3>
            <div className="space-y-2">
              {bills.map(b => (
                <div key={b.id} className="bg-gray-900/40 border border-gray-800 rounded-xl p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">{b.name}</span>
                    <span className="text-[10px] text-gray-500 capitalize">Due: {b.due_date} ({b.interval})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-indigo-400 block">Rs. {b.amount.toLocaleString()}</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase mt-0.5 inline-block">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Goals */}
          <div className="border-t border-gray-800/80 pt-5">
            <h3 className="text-md font-bold text-white flex items-center gap-2 mb-3">
              <Goal className="w-4 h-4 text-accent" />
              Savings Targets
            </h3>
            <div className="space-y-3">
              {goals.map(g => {
                const percent = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                return (
                  <div key={g.id} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block">{g.name}</span>
                        <span className="text-[10px] text-gray-500">Target Date: {g.target_date}</span>
                      </div>
                      <div className="text-right font-bold text-white">
                        Rs. {g.current_amount.toLocaleString()} / {g.target_amount.toLocaleString()}
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="w-full bg-gray-800 rounded-full h-1.5">
                      <div className="bg-accent h-1.5 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
