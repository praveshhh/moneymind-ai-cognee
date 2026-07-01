import React, { useState, useEffect } from "react";
import axios from "axios";
import Dashboard from "./components/Dashboard";
import AIChat from "./components/AIChat";
import MemoryTimeline from "./components/MemoryTimeline";
import GraphVisualizer from "./components/GraphVisualizer";
import { Brain, LayoutDashboard, Clock, RefreshCw, LogOut, ShieldAlert, Sparkles } from "lucide-react";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Triggers to sync datasets across components
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Auto-login helper for demo velocity
  useEffect(() => {
    if (!token) {
      autoLogin();
    } else {
      fetchMe();
    }
  }, [token]);

  const autoLogin = async () => {
    try {
      const formData = new URLSearchParams();
      formData.append("username", "demo");
      formData.append("password", "demo123");

      const res = await axios.post("http://localhost:8000/api/auth/login", formData, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      localStorage.setItem("token", res.data.access_token);
      setToken(res.data.access_token);
      setUser(res.data.user);
    } catch (e) {
      console.log("Auto login failed. Seeding database first might be required.");
    }
  };

  const fetchMe = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (e) {
      // Token expired
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  const handleClearGraph = async () => {
    if (!window.confirm("Are you sure you want to clear your Cognee memory graph? This will reset all learned sentiments and habits.")) return;
    try {
      await axios.post("http://localhost:8000/api/chat/clear", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Cognee memory graph successfully cleared!");
      handleRefresh();
    } catch (e) {
      alert("Failed to clear memory graph.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-gray-300 flex flex-col relative overflow-hidden checkered-bg font-mono">
      
      {/* Background ambient lighting glows disabled via CSS */}
      <div className="ambient-glow bg-primary/10 top-[-200px] left-[-200px]" />
      <div className="ambient-glow bg-indigo-500/10 bottom-[-200px] right-[-200px]" />

      {/* Top Navigation Header */}
      <header className="border-b border-white/10 bg-black/80 backdrop-blur-sm sticky top-0 z-35 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-primary/40 bg-black p-[1.5px] shadow-[0_0_10px_rgba(180,217,253,0.15)] flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-md font-bold text-white tracking-wider flex items-center gap-1.5 uppercase">
              MoneyMind AI
              <span className="px-1.5 py-0.5 rounded text-[8px] bg-primary/10 text-primary border border-primary/30 uppercase font-bold tracking-widest">
                Hackathon Build
              </span>
            </h1>
            <p className="text-[10px] text-gray-400 tracking-wide uppercase">Memory-Native Financial Assistant</p>
          </div>
        </div>

        {/* Tab Controls */}
        <nav className="hidden md:flex gap-2">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-dashed transition-colors rounded-md ${
              activeTab === "dashboard" ? "bg-accent text-black border-transparent" : "border-white/30 text-gray-400 hover:bg-accent hover:text-black hover:border-transparent"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-dashed transition-colors rounded-md ${
              activeTab === "chat" ? "bg-accent text-black border-transparent" : "border-white/30 text-gray-400 hover:bg-accent hover:text-black hover:border-transparent"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            AI Memory Chat
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-dashed transition-colors rounded-md ${
              activeTab === "timeline" ? "bg-accent text-black border-transparent" : "border-white/30 text-gray-400 hover:bg-accent hover:text-black hover:border-transparent"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Memory Graph & Timeline
          </button>
        </nav>

        {/* Admin Toggles */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-wide">Active Account</span>
              <span className="text-xs font-bold text-gray-200">{user.username}</span>
            </div>
          )}
          <button
            onClick={handleClearGraph}
            className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-danger/50 text-danger hover:bg-danger hover:text-black hover:border-transparent text-[10px] font-mono uppercase tracking-wider rounded-md transition-colors"
            title="Reset Cognee Memory Graph"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Memory
          </button>
        </div>
      </header>

      {/* Main Workspace Area */}
      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full z-10">
        
        {/* Mobile Tab Control */}
        <div className="md:hidden flex gap-2 mb-6 justify-around">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider border border-dashed rounded-md transition-colors ${
              activeTab === "dashboard" ? "bg-accent text-black border-transparent" : "border-white/30 text-gray-400 hover:text-white"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider border border-dashed rounded-md transition-colors ${
              activeTab === "chat" ? "bg-accent text-black border-transparent" : "border-white/30 text-gray-400 hover:text-white"
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex-1 py-2 text-center text-[10px] font-mono uppercase tracking-wider border border-dashed rounded-md transition-colors ${
              activeTab === "timeline" ? "bg-accent text-black border-transparent" : "border-white/30 text-gray-400 hover:text-white"
            }`}
          >
            Timeline
          </button>
        </div>

        {/* Selected View Render */}
        <div style={{ display: activeTab === "dashboard" ? "block" : "none" }}>
          <Dashboard onTransactionAdded={handleRefresh} />
        </div>

        <div style={{ display: activeTab === "chat" ? "block" : "none" }}>
          <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            <AIChat />
          </div>
        </div>

        <div style={{ display: activeTab === "timeline" ? "block" : "none" }}>
          <div className="space-y-6">
            <GraphVisualizer refreshTrigger={refreshTrigger} />
            <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
              <MemoryTimeline refreshTrigger={refreshTrigger} onGraphUpdate={handleRefresh} />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-background/50 py-4 text-center text-[10px] text-gray-500 z-10">
        MoneyMind AI © 2026. Made with Cognee Hybrid Vector-Graph Memory Control Plane.
      </footer>
    </div>
  );
}
