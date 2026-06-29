import React, { useState, useEffect } from "react";
import axios from "axios";
import { Network, Info, Award, Calendar, ShoppingBag, Smile, ShieldAlert } from "lucide-react";

export default function GraphVisualizer({ refreshTrigger }) {
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [selectedNode, setSelectedNode] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/api/chat/graph", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGraph(res.data);
    } catch (e) {
      console.error("Failed to load graph", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [refreshTrigger]);

  // Layout algorithm: Calculate positions based on node types
  const getPosition = (node, index, total) => {
    const width = 800;
    const height = 450;
    const centerX = width / 2;
    const centerY = height / 2;

    switch (node.type) {
      case "user":
        return { x: centerX, y: centerY - 50 };

      case "goal":
        // Spread goals in an arc on the top left
        const goalAngle = Math.PI * (0.6 + (index / (total || 1)) * 0.3);
        return {
          x: centerX + Math.cos(goalAngle) * 200,
          y: (centerY - 50) + Math.sin(goalAngle) * 150
        };

      case "obligation":
        // Spread obligations in an arc on the top right
        const obAngle = Math.PI * (0.1 + (index / (total || 1)) * 0.3);
        return {
          x: centerX + Math.cos(obAngle) * 200,
          y: (centerY - 50) + Math.sin(obAngle) * 150
        };

      case "transaction":
        // Spread transactions horizontally at the bottom
        const stepX = width / (total + 1 || 2);
        return {
          x: stepX * (index + 1),
          y: centerY + 80
        };

      case "merchant":
        // Placed below transaction
        return {
          x: getPosition({ type: "transaction" }, index, total).x - 40,
          y: centerY + 160
        };

      case "category":
        // Placed below transaction
        return {
          x: getPosition({ type: "transaction" }, index, total).x + 40,
          y: centerY + 160
        };

      case "sentiment":
        // Placed above transaction
        return {
          x: getPosition({ type: "transaction" }, index, total).x,
          y: centerY + 130
        };

      default:
        return { x: centerX + (index - total / 2) * 50, y: centerY };
    }
  };

  // Group nodes by type for positioning counts
  const nodesByType = {};
  graph.nodes.forEach((n) => {
    nodesByType[n.type] = nodesByType[n.type] || [];
    nodesByType[n.type].push(n);
  });

  const positionedNodes = graph.nodes.map((node) => {
    const group = nodesByType[node.type];
    const index = group.indexOf(node);
    const pos = getPosition(node, index, group.length);
    return { ...node, ...pos };
  });

  const nodeMap = {};
  positionedNodes.forEach((n) => {
    nodeMap[n.id] = n;
  });

  const getNodeColor = (type) => {
    switch (type) {
      case "user": return "#10b981"; // green
      case "goal": return "#f59e0b"; // amber
      case "obligation": return "#6366f1"; // indigo
      case "transaction": return "#3b82f6"; // blue
      case "merchant": return "#a855f7"; // purple
      case "category": return "#ec4899"; // pink
      case "sentiment": return "#ef4444"; // red
      default: return "#9ca3af";
    }
  };

  const getNodeIcon = (type) => {
    switch (type) {
      case "user": return <Smile className="w-4 h-4 text-white" />;
      case "goal": return <Award className="w-4 h-4 text-white" />;
      case "obligation": return <Calendar className="w-4 h-4 text-white" />;
      case "transaction": return <ShoppingBag className="w-4 h-4 text-white" />;
      case "merchant": return <Network className="w-4 h-4 text-white" />;
      default: return <Info className="w-4 h-4 text-white" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* SVG Canvas */}
      <div className="lg:col-span-3 glass-panel rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[480px]">
        <div className="flex items-center justify-between mb-4 z-10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-primary" />
              Cognee-Generated Memory Graph
            </h3>
            <p className="text-xs text-gray-400">Interactive live view of extracted financial entities & relationships</p>
          </div>
          <button 
            onClick={fetchGraph}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-xs font-semibold rounded-lg transition"
          >
            Refresh Graph
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="flex-1 relative w-full overflow-x-auto">
            <svg viewBox="0 0 800 450" className="w-full min-w-[700px] h-[380px] select-none">
              {/* Draw Edges */}
              {graph.edges.map((edge, idx) => {
                const sourceNode = nodeMap[edge.source];
                const targetNode = nodeMap[edge.target];
                if (!sourceNode || !targetNode) return null;

                return (
                  <g key={`edge-${idx}`}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1.5"
                    />
                    {/* Relationship Labels on edge midpoints */}
                    <text
                      x={(sourceNode.x + targetNode.x) / 2}
                      y={(sourceNode.y + targetNode.y) / 2 - 4}
                      fill="rgba(156, 163, 175, 0.45)"
                      fontSize="7"
                      fontWeight="600"
                      textAnchor="middle"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {positionedNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const size = node.type === "user" ? 22 : node.type === "transaction" ? 18 : 15;

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedNode(node)}
                  >
                    {/* Glow outline on selected */}
                    {isSelected && (
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={size + 6}
                        fill="none"
                        stroke={getNodeColor(node.type)}
                        strokeWidth="2"
                        className="animate-ping"
                        style={{ animationDuration: "2s" }}
                      />
                    )}
                    {/* Base circle background */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={size}
                      fill={getNodeColor(node.type)}
                      className="transition-all hover:scale-110"
                    />
                    {/* Inner graphic/initials */}
                    <text
                      x={node.x}
                      y={node.y + 3}
                      fill="#ffffff"
                      fontSize="8"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {node.label.charAt(0)}
                    </text>
                    {/* Node Text Label below circle */}
                    <text
                      x={node.x}
                      y={node.y + size + 11}
                      fill={isSelected ? "#ffffff" : "rgba(209, 213, 219, 0.85)"}
                      fontSize="9"
                      fontWeight={isSelected ? "bold" : "normal"}
                      textAnchor="middle"
                    >
                      {node.label.length > 12 ? `${node.label.slice(0, 10)}...` : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-400 border-t border-gray-800/50 pt-3">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-primary" /> User</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Goals</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#6366f1]" /> Obligations</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" /> Transactions</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#a855f7]" /> Merchants</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ec4899]" /> Categories</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Sentiments</div>
        </div>
      </div>

      {/* Selected Node Details Panel */}
      <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-md font-bold text-white flex items-center gap-2 mb-4 border-b border-gray-800 pb-2">
            <Info className="w-4 h-4 text-indigo-400" />
            Memory Inspector
          </h3>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Node ID</span>
                <span className="text-sm font-semibold text-white font-mono break-all">{selectedNode.id}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Type</span>
                <span 
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase inline-block mt-1"
                  style={{ backgroundColor: `${getNodeColor(selectedNode.type)}22`, color: getNodeColor(selectedNode.type) }}
                >
                  {selectedNode.type}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Name / Label</span>
                <span className="text-md font-bold text-white block mt-1">{selectedNode.label}</span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">Core Value</span>
                <span className="text-sm text-gray-200 block mt-1">{selectedNode.value}</span>
              </div>

              {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                <div className="border-t border-gray-800/80 pt-3">
                  <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider mb-2">Properties</span>
                  <div className="bg-black/30 rounded-lg p-2.5 space-y-2 text-xs">
                    {Object.entries(selectedNode.properties).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2">
                        <span className="text-gray-400 capitalize">{k.replace('_', ' ')}:</span>
                        <span className="text-gray-200 font-medium text-right break-all">{v ? String(v) : "N/A"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-gray-500">
              <Network className="w-10 h-10 mb-3 text-gray-600 animate-pulse" />
              <p className="text-xs">Click a node in the Cognee memory graph to inspect its properties and linkages.</p>
            </div>
          )}
        </div>

        {selectedNode?.properties?.sentiment === "Regret" && (
          <div className="mt-4 bg-danger/10 border border-danger/20 rounded-xl p-3 flex gap-2 items-start">
            <ShieldAlert className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <p className="text-[10px] text-danger-300">
              <strong>Impulse Danger Detected</strong>: This merchant/category has a past emotion marked as Regret. The AI agent will discourage similar transactions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
