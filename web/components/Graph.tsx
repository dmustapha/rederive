// File: web/components/Graph.tsx
"use client";
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background, BackgroundVariant, Controls as FlowControls, Handle, Position,
  Node, Edge, NodeProps, MarkerType,
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";
import type { StateResp } from "../lib/api";

const NODE_W = 176, NODE_H = 52;
const TOAST_CLASS = new Set(["match", "mismatch", "stale"]); // known-verdict allowlist

// Verdict → accent-bar color. The bar is the ONLY hue carrier; tags stay muted grey.
const VERDICT: Record<string, { c: string; label: string }> = {
  source:      { c: "#64748b", label: "source" },
  pending:     { c: "#475569", label: "pending" },
  stored:      { c: "#38bdf8", label: "stored" },
  derived:     { c: "#3b82f6", label: "derived" },
  reused:      { c: "#22c55e", label: "reused" },
  cutoff:      { c: "#a3e635", label: "cutoff" },
  error:       { c: "#f59e0b", label: "error" },
  invalidated: { c: "#ef4444", label: "stale" },
};
function kindOf(id: string): string {
  if (id.startsWith("src_")) return "SRC";
  if (id.startsWith("x_")) return "EXTRACT";
  if (id.startsWith("m_")) return "METRIC";
  if (id.startsWith("s_")) return "SYNTH";
  return "NODE";
}

type NodeData = {
  label: string; verdict: string; kind: string;
  verified?: "MATCH" | "MISMATCH" | null; isSource: boolean; dim: boolean;
  onActivate?: () => void;
};

// A real card: verdict accent bar + mono label + stage tag. Keyboard-reachable (WCAG 2.1.1).
function DerivationNode({ data, selected }: NodeProps<NodeData>) {
  const v = VERDICT[data.verdict] ?? VERDICT.pending;
  const interactive = !!data.onActivate;
  return (
    <div
      className={`rf-node${selected ? " sel" : ""}${data.dim ? " dim" : ""}${data.verified ? " v-" + data.verified.toLowerCase() : ""}`}
      style={{ ["--vc" as string]: v.c }}
      tabIndex={interactive ? 0 : -1}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? `verify ${data.label}` : undefined}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); data.onActivate!(); }
      }}
    >
      {!data.isSource && <Handle type="target" position={Position.Left} className="rf-handle" />}
      <span className="rf-accent" />
      <div className="rf-body">
        <div className="rf-label">{data.label}</div>
        <div className="rf-meta">
          <span className="rf-kind">{data.kind}</span>
          <span className="rf-verdict">{v.label}</span>
          {data.verified === "MATCH" && <span className="rf-tick ok">✓</span>}
          {data.verified === "MISMATCH" && <span className="rf-tick bad">✗</span>}
        </div>
      </div>
      <Handle type="source" position={Position.Right} className="rf-handle" />
    </div>
  );
}

const nodeTypes = { rederive: DerivationNode };

export default function Graph({
  state, onVerify,
}: { state: StateResp | null; onVerify: (n: string) => Promise<string> }) {
  const [toast, setToast] = useState<{ node: string; verdict: string } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const doVerify = useCallback(async (nodeId: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ node: nodeId, verdict: "…" });
    try { setToast({ node: nodeId, verdict: await onVerify(nodeId) }); }
    catch { setToast({ node: nodeId, verdict: "error" }); }
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, [onVerify]);

  const { nodes, edges } = useMemo(() => {
    if (!state?.nodes?.length) return { nodes: [] as Node[], edges: [] as Edge[] };
    const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "LR", nodesep: 26, ranksep: 120, marginx: 24, marginy: 24 });
    const ids = new Set(state.nodes.map((n) => n.id));
    state.nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    state.edges.forEach(([a, b]) => { if (ids.has(a) && ids.has(b)) g.setEdge(a, b); });
    dagre.layout(g);

    // "hot" = a node in the active cone (just derived/cutoff/errored/invalidated). When a cone is
    // live, non-cone nodes dim so the active subgraph pops (design-critique W1).
    const hot = new Set(state.nodes.filter((n) => ["derived", "cutoff", "error", "invalidated"].includes(n.verdict)).map((n) => n.id));
    const coneActive = hot.size > 0;

    const nodes: Node[] = state.nodes.map((n) => ({
      id: n.id,
      type: "rederive",
      position: { x: g.node(n.id).x - NODE_W / 2, y: g.node(n.id).y - NODE_H / 2 },
      data: {
        label: n.id.replace(/^src_/, ""),
        verdict: n.verdict,
        kind: kindOf(n.id),
        verified: n.verified ?? null,
        isSource: n.id.startsWith("src_"),
        dim: coneActive && !hot.has(n.id) && !n.id.startsWith("src_"),
        onActivate: n.id.startsWith("src_") ? undefined : () => doVerify(n.id),
      },
      draggable: false,
    }));

    const edges: Edge[] = state.edges
      .map(([a, b], i) => {
        if (!ids.has(a) || !ids.has(b)) return null;
        const live = hot.has(b);
        return {
          id: `e${i}`, source: a, target: b, type: "smoothstep",
          animated: live,
          style: { stroke: live ? "#22d3ee" : "#243049", strokeWidth: live ? 1.6 : 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: live ? "#22d3ee" : "#243049", width: 14, height: 14 },
        } as Edge;
      })
      .filter(Boolean) as Edge[];
    return { nodes, edges };
  }, [state, doVerify]);

  const onNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (!node.id.startsWith("src_")) doVerify(node.id);
  }, [doVerify]);

  if (!state) return <div className="loading">connecting to engine…</div>;
  if (!state.nodes?.length)
    return <div className="loading">memory empty — cold start · run the dossier to compile the graph</div>;

  const toastKind = toast && TOAST_CLASS.has(toast.verdict.toLowerCase()) ? toast.verdict.toLowerCase() : "";

  return (
    <>
      <ReactFlow
        nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView
        proOptions={{ hideAttribution: true }} minZoom={0.2} maxZoom={1.6}
        nodesConnectable={false} onNodeClick={onNodeClick}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background variant={BackgroundVariant.Dots} color="#1b2740" gap={26} size={1} />
        <FlowControls showInteractive={false} position="bottom-right" />
      </ReactFlow>
      {toast && (
        <div className={`verify-toast ${toastKind}`} role="status" aria-live="polite">
          <span className="vt-node">{toast.node}</span>
          <span className="vt-verdict">verify · {toast.verdict}</span>
        </div>
      )}
    </>
  );
}
