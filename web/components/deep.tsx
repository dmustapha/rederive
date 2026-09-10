// File: web/components/deep.tsx
// Deep Sibyl-integration surfaces (§21). Each is a real, reachable control wired to the live API
// with loading / empty / error states. No placeholders — empty backends render honest empty states.
"use client";
import { useEffect, useState } from "react";
import { getJSON, postJSON, StateResp } from "../lib/api";

const GRAPH_NODES = [
  "x_docs", "x_github", "x_token", "x_team", "x_community", "x_audits",
  "m_storage_arch", "m_api_surface", "m_doc_quality", "m_commit_rate",
  "m_test_coverage", "m_bus_factor", "m_supply_risk", "m_utility",
  "m_liquidity", "m_growth", "m_sentiment", "m_transparency",
  "s_risk", "s_score", "s_verdict",
];

// ── 1. Five-tier reveal — the five Sibyl tiers as load-bearing (§21.1) ─────────
export function FiveTier({ state }: { state: StateResp | null }) {
  const cursor = (state as any)?.cursor ?? null;
  const rows = [
    { tier: "HOT", api: "set_state / get_state", role: "live run cursor",
      live: cursor ? `${cursor.node ?? "—"} ${cursor.done ?? 0}/${cursor.total ?? 0}` : "idle" },
    { tier: "WARM", api: "set_entity / get_entity", role: "derivation cache + provenance",
      live: state ? `${state.nodes.length} nodes cached` : "…" },
    { tier: "COLD", api: "write_event / read_events", role: "append-only journal + attribution",
      live: "journal active" },
    { tier: "REFERENCE", api: "set_reference / get_reference", role: "editable pricing doctrine",
      live: "see Doctrine panel" },
    { tier: "ARCHIVE", api: "archive_entity vs delete_entity", role: "recoverable dead-cone morgue",
      live: "see Time-machine panel" },
  ];
  return (
    <div className="panel">
      <h3>Five Sibyl tiers · all load-bearing</h3>
      <div className="tier-list">
        {rows.map((r) => (
          <div key={r.tier} className="tier-row">
            <span className={`tier-tag t-${r.tier.toLowerCase()}`}>{r.tier}</span>
            <div className="tier-body">
              <div className="tier-role">{r.role}</div>
              <code className="tier-api">{r.api}</code>
            </div>
            <span className="tier-live">{r.live}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── 2. Doctrine editor — edit unit_usd, price changes with NO code change (NN-6) ──
export function DoctrineEditor({ adminToken, onChanged }: { adminToken: string; onChanged: () => void }) {
  const [unit, setUnit] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = () => getJSON<any>("/doctrine")
    .then((d) => { setUnit(d.unit_usd_live); setDraft(String(d.unit_usd_live)); })
    .catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const save = async () => {
    setBusy(true); setErr(null);
    try {
      const d = await postJSON<any>("/doctrine",
        { unit_usd: Number(draft), currency: "USD", basis: "one executed derivation" }, adminToken);
      setUnit(d.unit_usd_live); onChanged();
    } catch (e: any) { setErr(e.message ?? "needs admin token"); }
    finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <h3>Pricing doctrine · REFERENCE tier</h3>
      <div className="muted" style={{ marginBottom: 6 }}>
        Change the price with no code change — the quote re-reads it live (NN-6).
      </div>
      <div className="btn-row">
        <label className="inline-lbl">unit&nbsp;$
          <input type="number" step="0.01" value={draft}
            onChange={(e) => setDraft(e.target.value)} style={{ width: 90 }} />
        </label>
        <button onClick={save} disabled={busy}>{busy ? "writing…" : "Set doctrine"}</button>
      </div>
      {unit != null && <small className="muted">live unit: ${Number(unit).toFixed(3)} / derivation</small>}
      {err && <div className="err">{err}</div>}
    </div>
  );
}

// ── 3. FTS5 recall — search box → tier-labeled hits (§21.2) ───────────────────
export function RecallPanel() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<any[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const search = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(null);
    try { setHits((await getJSON<any>(`/recall?q=${encodeURIComponent(q)}`)).hits ?? []); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <h3>Recall · FTS5 over all tiers (zero embeddings)</h3>
      <div className="btn-row">
        <input placeholder="keyword — e.g. storage, audit, liquidity" value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()} />
        <button onClick={search} disabled={busy}>{busy ? "…" : "Recall"}</button>
      </div>
      {err && <div className="err">{err}</div>}
      {hits && (hits.length === 0
        ? <div className="muted" style={{ marginTop: 6 }}>no hits for “{q}”</div>
        : <div className="recall-list">
            {hits.map((h, i) => (
              <div key={i} className="recall-hit">
                <span className={`tier-tag t-${(h.tier ?? "").toLowerCase()}`}>{h.tier}</span>
                <span className="recall-key">{h.match?.key ?? h.key}</span>
                <span className="recall-snip">{(h.match?.snippet ?? "").slice(0, 90)}</span>
              </div>
            ))}
          </div>)}
    </div>
  );
}

// ── 4. Commons attribution — analyst tenants + cross-tenant ledger (NN-7) ─────
export function CommonsPanel({ adminToken }: { adminToken: string }) {
  const [data, setData] = useState<{ tenants: string[]; attributions: any[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const load = () => getJSON<any>("/commons").then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const run = async () => {
    setBusy(true); setErr(null);
    try { await postJSON("/commons/run", {}, adminToken); await load(); }
    catch (e: any) { setErr(e.message ?? "needs admin token"); }
    finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <h3>Commons · multi-tenant attribution</h3>
      <div className="btn-row">
        <button onClick={run} disabled={busy}>{busy ? "running analysts…" : "Run commons"}</button>
      </div>
      {err && <div className="err">{err}</div>}
      {data && (
        <>
          <div className="chips" style={{ marginTop: 8 }}>
            {data.tenants.length === 0
              ? <span className="muted">no tenants yet — run the commons to populate the ledger</span>
              : data.tenants.map((t) => <span key={t} className="chip derived">{t}</span>)}
          </div>
          {data.attributions.length > 0 && (
            <small className="muted" style={{ display: "block", marginTop: 6 }}>
              {data.attributions.length} cross-tenant citations recorded
            </small>
          )}
        </>
      )}
    </div>
  );
}

// ── 5. Time-machine vs delete — ARCHIVE recover vs hard delete (§21.1) ────────
export function TimeMachinePanel({ adminToken, onChanged }: { adminToken: string; onChanged: () => void }) {
  const [node, setNode] = useState("m_storage_arch");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"" | "restore" | "delete">("");
  const restore = async () => {
    setBusy("restore"); setErr(null); setMsg(null);
    try {
      const r = await postJSON<any>("/timemachine", { node });
      setMsg(r.archived ? `recovered archived cone for ${node}` : `nothing archived for ${node}`);
      onChanged();
    } catch (e: any) { setErr(e.message); } finally { setBusy(""); }
  };
  const del = async () => {
    if (!confirm(`Hard-delete ${node}? This is NOT recoverable (contrast to ARCHIVE).`)) return;
    setBusy("delete"); setErr(null); setMsg(null);
    try { await postJSON("/delete_demo", { node }, adminToken); setMsg(`hard-deleted ${node} — gone`); onChanged(); }
    catch (e: any) { setErr(e.message ?? "needs admin token"); } finally { setBusy(""); }
  };
  return (
    <div className="panel">
      <h3>Archive vs delete · the contrast beat</h3>
      <select value={node} onChange={(e) => setNode(e.target.value)}>
        {GRAPH_NODES.map((n) => <option key={n}>{n}</option>)}
      </select>
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button className="ghost" onClick={restore} disabled={!!busy}>
          {busy === "restore" ? "…" : "Time-machine (recover)"}
        </button>
        <button className="danger" onClick={del} disabled={!!busy}>
          {busy === "delete" ? "…" : "Hard delete"}
        </button>
      </div>
      {msg && <small className="muted" style={{ display: "block", marginTop: 6 }}>{msg}</small>}
      {err && <div className="err">{err}</div>}
    </div>
  );
}

// ── 6. Anchor — receipt hash on Base; honest no-op until key is set (DT-10) ───
export function AnchorPanel({ adminToken }: { adminToken: string }) {
  const [res, setRes] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const anchor = async () => {
    setBusy(true); setErr(null); setRes(null);
    try { setRes(await postJSON<any>("/anchor", {}, adminToken)); }
    catch (e: any) { setErr(e.message ?? "run a dossier first, then anchor"); }
    finally { setBusy(false); }
  };
  return (
    <div className="panel">
      <h3>Anchor receipt · Base (NN-8)</h3>
      <div className="btn-row">
        <button onClick={anchor} disabled={busy}>{busy ? "anchoring…" : "Anchor last receipt"}</button>
      </div>
      {err && <div className="err">{err}</div>}
      {res && (
        <div style={{ marginTop: 6 }}>
          <div>
            <span className={`chip ${res.anchored ? "reused" : "cutoff"}`}>
              anchored: {String(res.anchored)}
            </span>
          </div>
          <code className="hash">{res.receipt_hash}</code>
          {res.tx
            ? <a className="link" href={`https://sepolia.basescan.org/tx/${res.tx}`} target="_blank" rel="noreferrer">view on Basescan ↗</a>
            : <small className="muted">{res.reason ?? "no-op until ANCHOR_PRIVATE_KEY is set (honest)"}</small>}
        </div>
      )}
    </div>
  );
}
