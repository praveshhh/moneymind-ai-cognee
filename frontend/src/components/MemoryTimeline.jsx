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
    <div className="glass-panel rounded-lg p-6 flex flex-col h-full font-mono">
      <div className="mb-6 border-b border-white/10 pb-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Financial Memory Timeline
        </h3>
        <p className="text-[10px] text-gray-500 mt-1 uppercase">Track events and register your post-purchase feelings to train the AI brain</p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 max-h-[500px]">
        {transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-[10px] uppercase border border-dashed border-white/10 rounded-md">
            No transactions found. Add a transaction or upload a statement to begin.
          </div>
        ) : (
          <div className="relative border-l border-white/10 ml-4 space-y-8">
            {transactions.map((tx) => {
              const isDebit = tx.amount > 0;
              const isRegret = tx.sentiment === "Regret";
              
              return (
                <div key={tx.id} className="relative pl-8">
                  {/* Timeline indicator dot */}
                  <span className={`absolute -left-2.5 top-1.5 w-5 h-5 rounded-none border border-white/20 flex items-center justify-center ${
                    isRegret ? "bg-danger" : tx.sentiment === "Happy" ? "bg-primary" : "bg-gray-600"
                  }`} />

                  {/* Transaction Card */}
                  <div className="bg-background border border-white/10 rounded-md p-4 transition-colors hover:border-primary/50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{tx.date}</span>
                        <h4 className="text-xs font-bold text-white mt-0.5 uppercase tracking-wider">{tx.merchant}</h4>
                        <span className="inline-block px-2 py-0.5 mt-1 bg-background border border-white/10 text-gray-400 rounded-sm text-[9px] uppercase font-bold tracking-wide">
                          {tx.category}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-bold ${isDebit ? "text-gray-400" : "text-primary"}`}>
                          {isDebit ? "-" : "+"} Rs. {Math.abs(tx.amount).toLocaleString()}
                        </span>
                        <span className="text-[9px] text-gray-500 block uppercase">{tx.type}</span>
                      </div>
                    </div>

                    {tx.note && (
                      <p className="text-[10px] text-gray-400 italic bg-white/5 rounded-sm p-2 mb-3 mt-2 border-l-2 border-primary/50">
                        "{tx.note}"
                      </p>
                    )}

                    {/* Post-Purchase Feedback loop */}
                    <div className="mt-3 pt-3 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                        Was this purchase worth it?
                      </span>
                      
                      <div className="flex gap-2 items-center">
                        <button
                          disabled={updatingId === tx.id}
                          onClick={() => handleFeedback(tx.id, "Happy")}
                          className={`flex items-center gap-1 px-2.5 py-1 border border-dashed rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            tx.sentiment === "Happy"
                              ? "bg-primary/10 text-primary border-primary"
                              : "border-white/10 text-gray-500 hover:border-primary/50 hover:text-primary"
                          }`}
                        >
                          <Smile className="w-3.5 h-3.5" />
                          <span>Yes</span>
                        </button>

                        <button
                          disabled={updatingId === tx.id}
                          onClick={() => handleFeedback(tx.id, "Neutral")}
                          className={`flex items-center gap-1 px-2.5 py-1 border border-dashed rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            tx.sentiment === "Neutral"
                              ? "bg-gray-800 text-gray-300 border-gray-500"
                              : "border-white/10 text-gray-500 hover:border-gray-500 hover:text-gray-300"
                          }`}
                        >
                          <Meh className="w-3.5 h-3.5" />
                          <span>Maybe</span>
                        </button>

                        <button
                          disabled={updatingId === tx.id}
                          onClick={() => handleFeedback(tx.id, "Regret")}
                          className={`flex items-center gap-1 px-2.5 py-1 border border-dashed rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            tx.sentiment === "Regret"
                              ? "bg-danger/10 text-danger border-danger"
                              : "border-white/10 text-gray-500 hover:border-danger/50 hover:text-danger"
                          }`}
                        >
                          <Frown className="w-3.5 h-3.5" />
                          <span>No</span>
                        </button>
                      </div>
                    </div>

                    {isRegret && (
                      <div className="mt-3 bg-danger/10 border border-dashed border-danger/30 rounded-md p-2 flex gap-1.5 items-center">
                        <ShieldAlert className="w-3.5 h-3.5 text-danger" />
                        <span className="text-[9px] uppercase tracking-wider text-danger font-bold">Impulse buy registered. AI remembers to warn you.</span>
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
