// File: web/components/Graph.tsx
"use client";
import ReactFlow, { Background, Controls as FlowControls, Node, Edge } from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import type { StateResp } from "../lib/api";

// The entire visual language: verdict → color. A judge reads it in three seconds.
const COLORS: Record<string, string> = {
  source: "#64748b", pending: "#334155", stored: "#0ea5e9", derived: "#3b82f6",
  reused: "#22c55e", cutoff: "#a3e635", error: "#f59e0b", invalidated: "#ef4444",
};

export default function Graph({
  state, onVerify,
}: { state: StateResp | null; onVerify: (n: string) => Promise<string> }) {
  if (!state) return <div className="loading">connecting to engine…</div>;
  if (!state.nodes?.length)
    return <div className="loading">memory empty — cold start (run the dossier to fill the graph)</div>;

  // DT (PLAN C4): ranksep 90, node width 140 to avoid LR overlap.
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 22, ranksep: 90 });
  const ids = new Set(state.nodes.map((n) => n.id));
  state.nodes.forEach((n) => g.setNode(n.id, { width: 140, height: 36 }));
  state.edges.forEach(([a, b]) => { if (ids.has(a) && ids.has(b)) g.setEdge(a, b); });
  dagre.layout(g);

  const nodes: Node[] = state.nodes.map((n) => ({
    id: n.id,
    position: { x: g.node(n.id).x, y: g.node(n.id).y },
    // ✓/✗ prefix is NOT color-only — colorblind-safe verify signal (§7D).
    data: {
      label:
        (n.verified === "MATCH" ? "✓ " : n.verified === "MISMATCH" ? "✗ " : "") +
        n.id.replace(/^src_/, ""),
    },
    style: {
      background: COLORS[n.verdict] ?? "#334155",
      color: "#fff", fontSize: 11, width: 140,
      border:
        n.verified === "MATCH" ? "2px solid #22c55e" :
        n.verified === "MISMATCH" ? "2px solid #ef4444" : "1px solid #0f172a",
      borderRadius: 8, padding: 6,
      boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
    },
  }));

  const edges: Edge[] = state.edges
    .map(([a, b], i) =>
      ids.has(a) && ids.has(b)
        ? { id: `e${i}`, source: a, target: b, animated: false, style: { stroke: "#475569" } }
        : null)
    .filter(Boolean) as Edge[];

  return (
    <ReactFlow
      nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}
      minZoom={0.2}
      onNodeClick={async (_e, node) => {
        // Source nodes have no re-derive; only derivation nodes are verifiable.
        if (!node.id.startsWith("src_")) alert(`verify ${node.id}: ${await onVerify(node.id)}`);
      }}
    >
      <Background color="#1e293b" gap={22} />
      <FlowControls showInteractive={false} />
    </ReactFlow>
  );
}
