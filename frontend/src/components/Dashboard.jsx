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
  const [summary, setSummary] = useState({ total_income: 0, total_expenses: 0 });

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

      const [accRes, billRes, goalRes, budgRes, userRes, txRes, sumRes] = await Promise.all([
        axios.get("http://localhost:8000/api/transactions/accounts", { headers }),
        axios.get("http://localhost:8000/api/bills", { headers }),
        axios.get("http://localhost:8000/api/goals", { headers }),
        axios.get("http://localhost:8000/api/budgets", { headers }),
        axios.get("http://localhost:8000/api/auth/me", { headers }),
        axios.get("http://localhost:8000/api/transactions?limit=10", { headers }),
        axios.get("http://localhost:8000/api/transactions/summary", { headers })
      ]);

      setBills(billRes.data);
      setGoals(goalRes.data);
      setBudgets(budgRes.data);
      setUser(userRes.data);
      setTransactions(txRes.data);
      setSummary(sumRes.data);

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
    if (!csvFile) return;
    setBtnLoading(prev => ({ ...prev, csv: true }));

    const formData = new FormData();
    formData.append("file", csvFile);
    formData.append("account_id", csvAccountId || "0");

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:8000/api/transactions/import-csv", formData, {
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
  const totalBills = bills.reduce((acc, curr) => acc + (curr.status === "Unpaid" ? curr.amount : 0), 0);
  
  // Real Statement Aggregates
  const totalIncome = summary?.total_income || 0;
  const totalExpenses = summary?.total_expenses || 0;

  // Real Savings Rate percentage (income - expenses) / income
  const savingsRate = totalIncome > 0 
    ? Math.max(0, Math.min(100, Math.round(((totalIncome - totalExpenses) / totalIncome) * 100))) 
    : 0;

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
        <div className="glass-panel rounded-lg p-5 relative overflow-hidden glass-card-glow-green">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                {accounts.length === 1 ? `${accounts[0].name} Balance` : "Total Cash & Savings"}
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">Rs. {checkingBal.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-background border border-primary/20 rounded-md">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-gray-500 leading-normal uppercase">Your current available savings balance.</span>
          </div>
        </div>

        {/* Card 2: Total Inflow */}
        <div className="glass-panel rounded-lg p-5 relative overflow-hidden glass-card-glow-green">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Inflow / Deposits</span>
              <h2 className="text-2xl font-bold text-white mt-1">Rs. {totalIncome.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-background border border-primary/20 rounded-md">
              <Plus className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-gray-500 leading-normal uppercase">Total money received from statement.</span>
          </div>
        </div>

        {/* Card 3: Total Outflow */}
        <div className="glass-panel rounded-lg p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Total Outflow / Expenses</span>
              <h2 className="text-2xl font-bold text-danger-400 mt-1">Rs. {totalExpenses.toLocaleString()}</h2>
            </div>
            <div className="p-2.5 bg-background border border-danger/20 rounded-md">
              <AlertTriangle className="w-5 h-5 text-danger" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            <span className="text-[10px] text-gray-500 leading-normal uppercase">Total money spent from statement.</span>
          </div>
        </div>

        {/* Card 4: Savings Rate */}
        <div className="glass-panel rounded-lg p-5 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Real Savings Rate</span>
              <h2 className="text-2xl font-bold text-white mt-1">{savingsRate}%</h2>
            </div>
            <div className="p-2.5 bg-background border border-accent/20 rounded-md">
              <Percent className="w-5 h-5 text-accent" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-background border border-white/10 rounded-full h-1 mt-3 relative overflow-hidden">
            <div className="bg-accent h-1 absolute left-0 top-0" style={{ width: `${savingsRate}%` }} />
          </div>
        </div>
      </div>

      {/* Grid Layout: Ingestion Tools & Ledger & Commitments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1: Money Mind Control Panel (Ingestion) */}
        <div className="glass-panel rounded-lg p-6 space-y-6">
          {/* CSV/PDF Import */}
          <div>
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-1 tracking-wider">
              <Upload className="w-4 h-4 text-primary" />
              Import Statement
            </h3>
            <p className="text-[10px] text-gray-500 uppercase">Bulk ingest bank statement entries into the memory graph</p>
            
            <form onSubmit={handleCsvUpload} className="space-y-3 mt-3">
              <select
                value={csvAccountId}
                onChange={(e) => setCsvAccountId(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 uppercase focus:outline-none focus:border-primary/50 transition-colors"
              >
                <option value="">Auto-Detect Bank Account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              
              <input
                type="file"
                accept=".csv,.pdf"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-[10px] file:uppercase file:tracking-wider file:font-bold file:bg-background file:border file:border-white/10 file:text-gray-300 hover:file:bg-white/5 transition-colors"
                required
              />
              
              <button
                type="submit"
                disabled={btnLoading.csv || !csvFile}
                className="w-full bg-transparent border border-dashed border-primary/50 hover:bg-primary hover:text-black text-primary font-bold p-2.5 rounded-md text-[10px] uppercase tracking-widest transition-colors"
              >
                {btnLoading.csv ? "Uploading..." : "Upload Bank Statement"}
              </button>
            </form>
          </div>

          {/* Remember Transaction Form */}
          <div className="border-t border-white/10 pt-5">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-1 tracking-wider">
              <Plus className="w-4 h-4 text-primary" />
              Remember Transaction
            </h3>
            <p className="text-[10px] text-gray-500 uppercase">Log a new purchase directly into the Cognee graph</p>
            
            <form onSubmit={handleAddTransaction} className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Account</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Amount (Rs)</label>
                  <input
                    type="number"
                    placeholder="e.g. 799"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors placeholder:text-gray-700"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Merchant</label>
                  <input
                    type="text"
                    placeholder="e.g. Netflix"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors placeholder:text-gray-700"
                    required
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors"
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
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Sentiment</label>
                  <select
                    value={sentiment}
                    onChange={(e) => setSentiment(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors"
                  >
                    <option value="Happy">Happy</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Regret">Regret</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold text-gray-500 block mb-1">Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Subscription"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors placeholder:text-gray-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={btnLoading.add}
                className="w-full bg-transparent border border-dashed border-primary/50 hover:bg-primary hover:text-black text-primary font-bold p-2.5 rounded-md text-[10px] uppercase tracking-widest transition-colors"
              >
                {btnLoading.add ? "Cognifying..." : "Remember Transaction"}
              </button>
            </form>
          </div>

          {/* SMS Webhook simulation */}
          <div className="border-t border-white/10 pt-5">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-1 tracking-wider">
              <MessageSquare className="w-4 h-4 text-secondary" />
              Mock UPI/SMS Ingestion
            </h3>
            <p className="text-[10px] text-gray-500 uppercase">Simulate incoming SMS transaction notification</p>
            
            <form onSubmit={handleSmsMock} className="space-y-3 mt-3">
              <select
                value={smsAccountId}
                onChange={(e) => setSmsAccountId(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors"
              >
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <input
                type="text"
                placeholder="ALERT: Spent Rs. 1800 at Nike Shoes on Card xx123"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                className="w-full bg-background border border-white/10 rounded-md p-2 text-xs text-gray-300 focus:outline-none focus:border-primary/50 transition-colors placeholder:text-gray-700"
                required
              />

              <button
                type="submit"
                disabled={btnLoading.sms || !smsText}
                className="w-full bg-transparent border border-dashed border-secondary/50 hover:bg-secondary hover:text-black text-secondary font-bold p-2.5 rounded-md text-[10px] uppercase tracking-widest transition-colors"
              >
                {btnLoading.sms ? "Parsing SMS..." : "Ingest Mock SMS"}
              </button>
            </form>
          </div>
        </div>

        {/* Column 2: Connected Bank Accounts & Recent Bank Ledger */}
        <div className="glass-panel rounded-lg p-6 space-y-6">
          {/* Accounts Breakdown */}
          <div>
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-3 tracking-wider">
              <Wallet className="w-4 h-4 text-primary" />
              Connected Bank Accounts
            </h3>
            <div className="space-y-2">
              {accounts.map(acc => {
                const isCredit = acc.type === "credit";
                return (
                  <div key={acc.id} className="bg-background border border-white/10 rounded-md p-3 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold text-white block uppercase tracking-wider">{acc.name}</span>
                      <span className="text-[9px] text-gray-500 uppercase">{acc.type} Account</span>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold ${isCredit ? "text-danger-400" : "text-primary"}`}>
                        Rs. {acc.balance.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Ingested Transactions Ledger */}
          <div className="border-t border-white/10 pt-5">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-3 tracking-wider">
              <Clock className="w-4 h-4 text-primary" />
              Recent Bank Ledger
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {transactions.length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-[10px] uppercase border border-dashed border-white/10 rounded-md">
                  No statement transactions found. Use the panel on the left to upload a statement.
                </div>
              ) : (
                transactions.slice(0, 10).map(tx => {
                  const isDebit = tx.amount > 0;
                  const isRegret = tx.sentiment === "Regret";
                  const isHappy = tx.sentiment === "Happy";
                  
                  return (
                    <div key={tx.id} className="bg-background border border-white/10 rounded-md p-2.5 flex justify-between items-center text-[10px] hover:border-primary/30 transition-colors uppercase">
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="font-bold text-gray-300 block truncate">{tx.merchant}</span>
                        <span className="text-[9px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                          {tx.date} • {tx.category}
                          <span className={`w-1.5 h-1.5 rounded-none ${
                            isRegret ? "bg-danger" : isHappy ? "bg-primary" : "bg-gray-600"
                          }`} title={`Sentiment: ${tx.sentiment}`} />
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`font-bold ${isDebit ? "text-gray-400" : "text-primary"}`}>
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
        <div className="glass-panel rounded-lg p-6 space-y-6">
          {/* Upcoming commitments */}
          <div>
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-3 tracking-wider">
              <Calendar className="w-4 h-4 text-primary" />
              Future Commitments
            </h3>
            <div className="space-y-2">
              {bills.length === 0 && (
                <div className="text-center py-6 text-gray-600 text-[10px] uppercase border border-dashed border-white/10 rounded-md">
                  No upcoming commitments found.
                </div>
              )}
              {bills.map(b => (
                <div key={b.id} className="bg-background border border-white/10 rounded-md p-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block uppercase tracking-wider">{b.name}</span>
                    <span className="text-[9px] text-gray-500 uppercase">Due: {b.due_date} ({b.interval})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-primary block">Rs. {b.amount.toLocaleString()}</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] bg-background border border-primary/30 text-primary font-bold uppercase mt-0.5 inline-block">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Goals */}
          <div className="border-t border-white/10 pt-5">
            <h3 className="text-xs uppercase font-bold text-white flex items-center gap-2 mb-3 tracking-wider">
              <Goal className="w-4 h-4 text-primary" />
              Savings Targets
            </h3>
            <div className="space-y-3">
              {goals.length === 0 && (
                <div className="text-center py-6 text-gray-600 text-[10px] uppercase border border-dashed border-white/10 rounded-md">
                  No active goals found.
                </div>
              )}
              {goals.map(g => {
                const percent = Math.min(100, Math.round((g.current_amount / g.target_amount) * 100));
                return (
                  <div key={g.id} className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-white block uppercase tracking-wider">{g.name}</span>
                        <span className="text-[9px] text-gray-500 uppercase">Target Date: {g.target_date}</span>
                      </div>
                      <div className="text-right font-bold text-white text-[10px]">
                        Rs. {g.current_amount.toLocaleString()} / {g.target_amount.toLocaleString()}
                      </div>
                    </div>
                    {/* Progress */}
                    <div className="w-full bg-background border border-white/10 rounded-full h-1 relative overflow-hidden">
                      <div className="bg-primary h-1 absolute left-0 top-0" style={{ width: `${percent}%` }} />
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
