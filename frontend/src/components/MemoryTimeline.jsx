import React, { useState, useEffect } from "react";
import axios from "axios";
import { Clock, ShieldAlert, Smile, Meh, Frown, CheckCircle } from "lucide-react";

export default function MemoryTimeline({ refreshTrigger, onGraphUpdate }) {
  const [transactions, setTransactions] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/api/transactions", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(res.data);
    } catch (e) {
      console.error("Failed to load transactions", e);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger]);

  const handleFeedback = async (id, sentiment) => {
    setUpdatingId(id);
    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:8000/api/chat/feedback", {
        transaction_id: id,
        sentiment: sentiment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Refresh local list
      await fetchTransactions();
      
      // Notify parent to refresh the graph visualizer
      if (onGraphUpdate) onGraphUpdate();
    } catch (e) {
      console.error("Failed to record sentiment", e);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-400" />
          Financial Memory Timeline
        </h3>
        <p className="text-xs text-gray-400">Track events and register your post-purchase feelings to train the AI brain</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[500px]">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            No transactions found. Add a transaction or upload a statement to begin.
          </div>
        ) : (
          <div className="relative border-l border-gray-800 ml-4 space-y-8">
            {transactions.map((tx) => {
              const isDebit = tx.amount > 0;
              const isRegret = tx.sentiment === "Regret";
              
              return (
                <div key={tx.id} className="relative pl-8">
                  {/* Timeline indicator dot */}
                  <span className={`absolute -left-2.5 top-1.5 w-5 h-5 rounded-full border-4 border-background flex items-center justify-center ${
                    isRegret ? "bg-danger" : tx.sentiment === "Happy" ? "bg-primary" : "bg-gray-700"
                  }`} />

                  {/* Transaction Card */}
                  <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 transition hover:border-gray-700/50 hover:bg-gray-900/80">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs text-gray-400">{tx.date}</span>
                        <h4 className="text-sm font-bold text-white mt-0.5">{tx.merchant}</h4>
                        <span className="inline-block px-2 py-0.5 mt-1 bg-gray-800 text-gray-400 rounded text-[9px] uppercase font-bold tracking-wide">
                          {tx.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${isDebit ? "text-gray-300" : "text-primary"}`}>
                          {isDebit ? "-" : "+"} Rs. {Math.abs(tx.amount).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-gray-500 block">{tx.type}</span>
                      </div>
                    </div>

                    {tx.note && (
                      <p className="text-xs text-gray-400 italic bg-black/20 rounded p-2 mb-3 mt-2 border-l border-indigo-500/30">
                        "{tx.note}"
                      </p>
                    )}

                    {/* Post-Purchase Feedback loop */}
                    <div className="mt-3 pt-3 border-t border-gray-800/60 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Was this purchase worth it?
                      </span>
                      
                      <div className="flex gap-2 items-center">
                        <button
                          disabled={updatingId === tx.id}
                          onClick={() => handleFeedback(tx.id, "Happy")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            tx.sentiment === "Happy"
                              ? "bg-primary/20 text-primary border border-primary/30"
                              : "bg-gray-800/50 text-gray-400 hover:bg-gray-850 hover:text-white"
                          }`}
                        >
                          <Smile className="w-3.5 h-3.5" />
                          <span>Yes</span>
                        </button>

                        <button
                          disabled={updatingId === tx.id}
                          onClick={() => handleFeedback(tx.id, "Neutral")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            tx.sentiment === "Neutral"
                              ? "bg-gray-700/40 text-gray-300 border border-gray-700/50"
                              : "bg-gray-800/50 text-gray-400 hover:bg-gray-850 hover:text-white"
                          }`}
                        >
                          <Meh className="w-3.5 h-3.5" />
                          <span>Maybe</span>
                        </button>

                        <button
                          disabled={updatingId === tx.id}
                          onClick={() => handleFeedback(tx.id, "Regret")}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                            tx.sentiment === "Regret"
                              ? "bg-danger/20 text-danger border border-danger/30"
                              : "bg-gray-800/50 text-gray-400 hover:bg-gray-850 hover:text-white"
                          }`}
                        >
                          <Frown className="w-3.5 h-3.5" />
                          <span>No</span>
                        </button>
                      </div>
                    </div>

                    {isRegret && (
                      <div className="mt-3 bg-danger/5 border border-danger/10 rounded-lg p-2 flex gap-1.5 items-center">
                        <ShieldAlert className="w-3.5 h-3.5 text-danger" />
                        <span className="text-[10px] text-danger-300">Impulse buy registered. AI remembers to warn you.</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
