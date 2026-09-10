// File: web/components/panels.tsx
"use client";
import { useState } from "react";
import type { QuoteResp, Receipt as ReceiptT } from "../lib/api";

const COLD_UNIT = 0.02;                     // doctrine unit; cold price = every node re-derived
const TOTAL_NODES = 24;                     // 24 derivation nodes (6 sources not priced)

export function PriceMeter({ quote, dbBytes }: { quote?: QuoteResp; dbBytes?: number }) {
  if (!quote) return <div className="panel"><h3>Quote (next run)</h3><div className="muted">connecting…</div></div>;
  const cold = TOTAL_NODES * COLD_UNIT;
  const savedPct = cold > 0 ? Math.round((1 - quote.total_usd / cold) * 100) : 0;
  return (
    <div className="panel">
      <h3>Quote · next run</h3>
      <div className="price">${quote.total_usd.toFixed(3)}
        <small> · {quote.derived_count} to derive · {quote.reused_count} reused free</small>
      </div>
      <div className="meter-row">
        <span className="strike">cold ${cold.toFixed(3)}</span>
        {savedPct > 0 && <span className="save-chip">−{savedPct}% memory saved</span>}
      </div>
      {dbBytes != null &&
        <small className="muted">memory.db: {(dbBytes / 1024).toFixed(1)} KB / 5120 KB cap</small>}
    </div>
  );
}

export function Controls({
  running, onRun, onReset, onAmnesia, onRestore, adminToken, setAdminToken,
}: {
  running: boolean; onRun: () => void; onReset: () => void;
  onAmnesia: () => void; onRestore: () => void;
  adminToken: string; setAdminToken: (v: string) => void;
}) {
  return (
    <div className="panel">
      <h3>Controls</h3>
      <div className="btn-row">
        <button onClick={onRun} disabled={running}>{running ? "deriving…" : "Run dossier"}</button>
        <button className="ghost" onClick={onAmnesia}>mv memory.db (amnesia)</button>
        <button className="ghost" onClick={onRestore}>restore</button>
        <button className="ghost" onClick={onReset}>reset</button>
      </div>
      <input
        placeholder="admin token (for edit / reset / amnesia)"
        value={adminToken}
        onChange={(e) => setAdminToken(e.target.value)}
        style={{ marginTop: 8 }}
      />
    </div>
  );
}

const SOURCES = ["docs", "github", "token", "team", "community", "audits"];
export function SourceEditor({ onEdit }: { onEdit: (s: string, c: string) => Promise<string[] | void> }) {
  const [source, setSource] = useState("docs");
  const [content, setContent] = useState("");
  const [invalidated, setInvalidated] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const apply = async () => {
    setBusy(true); setErr(null);
    try {
      const inv = await onEdit(source, content);
      setInvalidated(Array.isArray(inv) ? inv : []);
    } catch (e: any) { setErr(e?.message ?? "edit failed (admin token?)"); }
    finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <h3>Edit a source · watch the cone</h3>
      <select value={source} onChange={(e) => setSource(e.target.value)}>
        {SOURCES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <textarea
        rows={4} placeholder="paste the new source content…" value={content}
        onChange={(e) => setContent(e.target.value)} style={{ marginTop: 6 }}
      />
      <button style={{ marginTop: 6 }} onClick={apply} disabled={busy}>
        {busy ? "invalidating…" : "Apply edit"}
      </button>
      {err && <div className="err">{err}</div>}
      {invalidated && (
        <div className="chips" style={{ marginTop: 8 }}>
          {invalidated.length === 0
            ? <span className="muted">no nodes invalidated (field-equal cutoff)</span>
            : invalidated.map((n) => <span key={n} className="chip cutoff">{n}</span>)}
        </div>
      )}
    </div>
  );
}

export function Receipt({ receipt }: { receipt?: ReceiptT | null }) {
  if (!receipt) return (
    <div className="panel"><h3>Receipt · last run</h3><div className="muted">run the dossier to see the itemized receipt</div></div>
  );
  return (
    <div className="panel">
      <h3>Receipt · last run</h3>
      <div className="price sm">quoted ${Number(receipt.quoted_usd ?? receipt.total_usd ?? 0).toFixed(3)}</div>
      <div className="chips" style={{ marginTop: 8 }}>
        {receipt.derived?.map((n) => <span key={n} className="chip derived">{n}</span>)}
        {receipt.cutoff?.map((n) => <span key={"c" + n} className="chip cutoff">{n}✂</span>)}
        {receipt.reused?.map((n) => <span key={"r" + n} className="chip reused">{n}</span>)}
      </div>
      <small className="muted" style={{ display: "block", marginTop: 8 }}>
        {receipt.derived?.length ?? 0} derived · {(receipt as any).reused?.length ?? 0} reused free · {(receipt.cutoff?.length ?? 0)} cutoff ✂
      </small>
    </div>
  );
}
