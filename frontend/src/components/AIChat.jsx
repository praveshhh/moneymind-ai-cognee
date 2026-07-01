import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageSquare, Send, Bot, User, Brain, AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content: "Hello! I am your Financial Memory Brain. Ask me anything about your funds, upcoming bills, or check if you can afford a new purchase (e.g., 'Can I buy an Xbox today?'). I will check your obligations and past memories to advise you.",
      thinking: null
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim()) return;

    if (!textToSend) setInput("");

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://localhost:8000/api/chat", {
        message: text
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add bot response
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: res.data.response_text,
          decision: res.data.decision,
          reasons: res.data.reasons,
          simulated_balance: res.data.simulated_balance_after_purchase,
          mood_warning: res.data.mood_warning,
          thinking: res.data.thinking_path
        }
      ]);
    } catch (e) {
      console.error("Chat error", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Sorry, I had trouble thinking about that. Please make sure the backend is running and you have configured an LLM_API_KEY in the `.env` file.",
          thinking: null
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Can I buy a PlayStation 5 for Rs. 50,000?",
    "Do I have any regrets about buying shoes?",
    "Will I have enough money to pay rent next week?",
    "Show me a summary of my upcoming bills."
  ];

  return (
    <div className="glass-panel rounded-lg flex flex-col h-[580px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-2 bg-background">
        <Brain className="w-5 h-5 text-primary animate-pulse" />
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">MoneyMind Memory Brain</h3>
          <span className="text-[10px] text-primary font-mono uppercase tracking-widest flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-none bg-primary animate-ping" />
            Cognee Connected (sqlite + lancedb + kuzu)
          </span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => {
          const isBot = msg.role === "bot";
          return (
            <div key={idx} className={`flex gap-3 ${isBot ? "justify-start" : "justify-end"}`}>
              {isBot && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div className="max-w-[85%] space-y-2">
                {/* Content Bubble */}
                <div className={`p-3.5 rounded-md text-xs leading-relaxed font-mono ${
                  isBot 
                    ? "bg-background border border-white/10 text-gray-300" 
                    : "bg-primary text-black font-bold"
                }`}>
                  {msg.content}

                  {/* Decision Tag */}
                  {isBot && msg.decision && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        msg.decision === "Safe" 
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : msg.decision === "Risk"
                          ? "bg-accent/20 text-accent border border-accent/30"
                          : "bg-danger/20 text-danger border border-danger/30"
                      }`}>
                        Affordability: {msg.decision}
                      </span>
                      {msg.simulated_balance !== undefined && msg.simulated_balance > 0 && (
                        <span className="text-[10px] text-gray-400">
                          Proj. Balance: Rs. {msg.simulated_balance.toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reasons list */}
                  {isBot && msg.reasons && msg.reasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-[11px] text-gray-400 list-disc list-inside border-t border-white/10 pt-2.5 uppercase">
                      {msg.reasons.map((r, rIdx) => (
                        <li key={rIdx}>{r}</li>
                      ))}
                    </ul>
                  )}

                  {/* Mood Regret Warning */}
                  {isBot && msg.mood_warning && (
                    <div className="mt-3 bg-danger/10 border border-dashed border-danger/50 rounded-md p-2.5 flex gap-2 items-start text-[10px] text-danger uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
                      <span>{msg.mood_warning}</span>
                    </div>
                  )}
                </div>

                {/* Exposing the Cognee Thinking Path */}
                {isBot && msg.thinking && (
                  <details className="bg-black/30 border border-white/10 rounded-md p-2.5 text-[10px] uppercase tracking-wider transition hover:border-primary/50">
                    <summary className="cursor-pointer text-gray-400 font-bold hover:text-white flex items-center gap-1 select-none">
                      <Brain className="w-3 h-3 text-secondary" />
                      Expose Cognee Memory Path
                    </summary>
                    <div className="mt-2 space-y-2 text-gray-300 pl-4 border-l border-white/10">
                      <div>
                        <strong className="text-secondary block mb-0.5">Recalled from Cognee:</strong>
                        {msg.thinking.recalled_memories && msg.thinking.recalled_memories.length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-gray-400">
                            {msg.thinking.recalled_memories.map((m, mIdx) => (
                              <li key={mIdx}>"{m}"</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-500 italic">No semantic graph matching nodes found. Search fallback complete.</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[9px] pt-1.5 border-t border-white/10">
                        <div>
                          <strong className="text-gray-400 block">Metadata Check:</strong>
                          <span>{msg.thinking.checked_assets}</span>
                        </div>
                        <div>
                          <strong className="text-gray-400 block">Active Goals Scanned:</strong>
                          <span>{msg.thinking.goals_scanned} goals</span>
                        </div>
                      </div>
                    </div>
                  </details>
                )}
              </div>

              {!isBot && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-background" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
              <Bot className="w-4 h-4 text-primary animate-pulse" />
            </div>
            <div className="p-3 bg-background border border-white/10 rounded-md flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-none bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-none bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-none bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      {messages.length === 1 && (
        <div className="p-4 border-t border-white/10 bg-background space-y-2">
          <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider flex items-center gap-1">
            <Info className="w-3 h-3" /> Quick Scenario Prompts
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSend(p)}
                className="text-left p-2 bg-background border border-dashed border-white/10 hover:border-primary/50 hover:text-primary text-[10px] uppercase tracking-wider text-gray-400 rounded-md transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-4 border-t border-white/10 bg-background flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask MoneyMind if you can afford a purchase..."
          className="flex-1 bg-background border border-white/10 rounded-md px-4 py-2.5 text-xs text-white uppercase tracking-wider focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 border border-dashed border-primary/50 bg-transparent hover:bg-primary disabled:opacity-50 hover:text-black text-primary font-bold rounded-md flex items-center justify-center transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
