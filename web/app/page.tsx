// File: web/app/page.tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Graph from "../components/Graph";
import { SourceEditor, Receipt, Controls } from "../components/panels";
import {
  FiveTier, DoctrineEditor, RecallPanel, CommonsPanel, TimeMachinePanel, AnchorPanel,
} from "../components/deep";
import { StateResp, Receipt as ReceiptT, getJSON, postJSON } from "../lib/api";

const COLD_UNIT = 0.02;          // doctrine unit price
const TOTAL_DERIV = 24;          // 24 derivation nodes (6 sources not priced)
const COLD = TOTAL_DERIV * COLD_UNIT;

export default function Home() {
  const [state, setState] = useState<StateResp | null>(null);
  const [receipt, setReceipt] = useState<ReceiptT | null>(null);
  const [running, setRunning] = useState(false);
  // On the public demo deploy, NEXT_PUBLIC_DEMO_ADMIN_TOKEN pre-fills the token so judges can
  // drive the hero flow (edit → watch the cone), amnesia/deletion-test, and doctrine directly.
  // Empty locally (dev enters it by hand). The API still gates every mutation; state self-heals
  // (the baked warm seed re-hydrates on restart).
  const [adminToken, setAdminToken] = useState(process.env.NEXT_PUBLIC_DEMO_ADMIN_TOKEN ?? "");
  const runningRef = useRef(false);
  runningRef.current = running;

  const poll = useCallback(async () => {
    try { setState(await getJSON<StateResp>("/state")); } catch { /* keep last good state */ }
  }, []);

  // D-6: poll /state — 700ms live, widen to 1200ms while a run is in flight (DT, PLAN C4).
  useEffect(() => {
    poll();
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      poll();
      id = setTimeout(tick, runningRef.current ? 1200 : 700);
    };
    id = setTimeout(tick, 700);
    return () => clearTimeout(id);
  }, [poll]);

  const run = async () => {
    setRunning(true);
    try {
      const j = await postJSON<{ receipt?: ReceiptT }>("/answer", {});
      setReceipt(j.receipt ?? null);
    } catch { /* surfaced via unchanged graph */ }
    finally { setRunning(false); poll(); }
  };

  const edit = async (source: string, content: string): Promise<string[]> => {
    const j = await postJSON<{ invalidated: string[] }>("/edit", { source, content }, adminToken);
    poll();
    return j.invalidated ?? [];
  };

  const verify = async (node: string): Promise<string> => {
    const j = await postJSON<{ verdict: string }>("/verify", { node });
    poll();
    return j.verdict;
  };

  const admin = async (path: string, body: unknown = {}) => {
    await postJSON(path, body, adminToken);
    setReceipt(null); poll();
  };

  // ── hero stat, derived from the live quote (the money moment) ──
  const q = state?.quote;
  const price = q ? q.total_usd : null;
  const reused = q?.reused_count ?? 0;
  const toDerive = q?.derived_count ?? 0;
  const saved = q && COLD > 0 ? Math.round((1 - q.total_usd / COLD) * 100) : 0;
  const kb = state?.db_bytes != null ? (state.db_bytes / 1024).toFixed(0) : null;
  const warm = price === 0;

  return (
    <main className="stage">
      {/* ── HERO: thesis + the live number as the centerpiece stat ── */}
      <section className="hero">
        <div className="hero-copy">
          <div className="wordmark">REDERIVE</div>
          <h1 className="hero-h">Watch cognition compile.</h1>
          <p className="hero-p">
            A due-diligence dossier is a dependency graph — 6 sources, 24 derivations. Edit one
            source and only its <em>invalidation cone</em> re-derives; everything else is served from
            memory at zero cost. Incremental compilation, for an agent&rsquo;s reasoning — built
            load-bearing on all five Sibyl Memory tiers.
          </p>
          <div className="hero-tags">
            <span className="htag">content-addressed</span>
            <span className="htag">verify-on-serve</span>
            <span className="htag">x402-metered</span>
            <span className="htag">MCP · LangGraph</span>
          </div>
        </div>

        <div className={`hero-stat${warm ? " warm" : ""}`}>
          <div className="hstat-k">next-run cost · live</div>
          <div className="hstat-price">{price == null ? "—" : `$${price.toFixed(3)}`}</div>
          <div className="hstat-row">
            <span className="strike">cold ${COLD.toFixed(2)}</span>
            {saved > 0 && <span className="save-chip">−{saved}% reused</span>}
          </div>
          <div className="hstat-sub">
            {toDerive} to derive · {reused} of {TOTAL_DERIV} warm{kb ? ` · ${kb} KB in memory` : ""}
          </div>
          {state?.demo_free && (
            <span className="badge" title="payment bypassed for the demo (honest label — MUST-NOT-CLAIM)">
              demo mode · payment bypassed — real settlement in proof.md
            </span>
          )}
        </div>
      </section>

      {/* ── COMPILE CONSOLE: the DAG, framed as the centerpiece ── */}
      <section className="console">
        <div className="console-bar">
          <span className="console-t">dependency graph<span className="console-sub"> · sources → extractions → metrics → synthesis</span></span>
          <span className="legend">
            <span className="lg"><i className="dot d" />derived</span>
            <span className="lg"><i className="dot r" />reused</span>
            <span className="lg"><i className="dot c" />cutoff</span>
            <span className="lg"><i className="dot x" />invalidated</span>
            <span className="lg"><i className="dot s" />source</span>
          </span>
        </div>
        <div className="console-canvas"><Graph state={state} onVerify={verify} /></div>
      </section>

      {/* ── RECOMPILE RAIL: the hero action, laid out horizontally ── */}
      <section className="actions">
        <SourceEditor onEdit={edit} />
        <Controls
          running={running} onRun={run}
          onReset={() => admin("/reset")}
          onAmnesia={() => admin("/amnesia")}
          onRestore={() => admin("/amnesia", { restore: true })}
          adminToken={adminToken} setAdminToken={setAdminToken}
        />
        <Receipt receipt={receipt} />
      </section>

      {/* ── DEEP SIBYL INTEGRATION: below the fold, secondary grid ── */}
      <section className="deep-head">deep Sibyl integration · all five tiers load-bearing · §21</section>
      <section className="deep-grid">
        <FiveTier state={state} />
        <RecallPanel />
        <CommonsPanel adminToken={adminToken} />
        <DoctrineEditor adminToken={adminToken} onChanged={poll} />
        <TimeMachinePanel adminToken={adminToken} onChanged={poll} />
        <AnchorPanel adminToken={adminToken} />
      </section>

      <footer className="stage-foot">
        <span>Rederive · Sibyl Labs Memory Hackathon</span>
        <span className="foot-links">
          <a className="link" href="https://rederive-api.onrender.com/health" target="_blank" rel="noreferrer">API</a>
          <a className="link" href="https://sepolia.basescan.org/address/0xc211C942946011859ca634F22400d80570ED12A5" target="_blank" rel="noreferrer">Base Sepolia settlements</a>
        </span>
      </footer>
    </main>
  );
}
