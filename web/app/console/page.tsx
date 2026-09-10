// File: web/app/console/page.tsx — the interactive operator console.
// One clear path (Step 1 edit → Step 2 recompile); the deep machinery hides behind disclosure.
"use client";
import { useState } from "react";
import Link from "next/link";
import Graph from "../../components/Graph";
import { Receipt } from "../../components/panels";
import {
  FiveTier, DoctrineEditor, RecallPanel, CommonsPanel, TimeMachinePanel, AnchorPanel,
} from "../../components/deep";
import { useRederive } from "../../lib/useRederive";

const SOURCES = ["docs", "github", "token", "team", "community", "audits"];
const COLD = 24 * 0.02;

export default function Console() {
  const { state, receipt, running, adminToken, setAdminToken, poll, run, edit, verify, admin } = useRederive();
  const [source, setSource] = useState("token");
  const [content, setContent] = useState("");
  const [invalidated, setInvalidated] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const q = state?.quote;
  const price = q ? q.total_usd : null;
  const reused = q?.reused_count ?? 0;
  const toDerive = q?.derived_count ?? 0;
  const saved = q && COLD > 0 ? Math.round((1 - q.total_usd / COLD) * 100) : 0;
  const warm = price === 0;

  const applyEdit = async () => {
    setBusy(true); setErr(null);
    try { setInvalidated(await edit(source, content)); }
    catch (e: any) { setErr(e?.message ?? "edit failed — check the admin token"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <nav className="nav">
        <Link className="nav-brand" href="/"><b>RE</b>DERIVE</Link>
        <span className="nav-right">
          <Link className="nav-link" href="/">← Overview</Link>
          {state?.demo_free && <span className="badge">demo mode · payment bypassed</span>}
        </span>
      </nav>

      <div className="console-wrap">
        <div className="console-head">
          <div>
            <h1>Operator console</h1>
            <p>Edit a source, re-run the dossier, and watch only the changed cone recompute.</p>
          </div>
          <div className={`readout${warm ? " warm" : ""}`}>
            <div className="r-price">{price == null ? "—" : `$${price.toFixed(3)}`}</div>
            <div className="r-sub">
              <span className="r-strike">cold ${COLD.toFixed(2)}</span>
              {toDerive} to derive · {reused}/24 warm{saved > 0 ? ` · −${saved}%` : ""}
            </div>
          </div>
        </div>

        <div className="work">
          {/* the graph */}
          <div className="canvas-card">
            <div className="canvas-bar">
              <span className="c-t">dependency graph</span>
              <span className="legend">
                <span className="lg"><i className="dot d" />derived</span>
                <span className="lg"><i className="dot r" />reused</span>
                <span className="lg"><i className="dot c" />cutoff</span>
                <span className="lg"><i className="dot x" />invalidated</span>
                <span className="lg"><i className="dot s" />source</span>
              </span>
            </div>
            <div className="console-canvas"><Graph state={state} onVerify={verify} /></div>
          </div>

          {/* guided action */}
          <div className="guide">
            <div className="step">
              <span className="step-n"><b>1</b> edit a source</span>
              <p className="hint">Change a source&rsquo;s content — the graph marks everything downstream of it as invalidated.</p>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
              <textarea rows={4} placeholder="paste new source content…" value={content}
                onChange={(e) => setContent(e.target.value)} style={{ marginTop: 8 }} />
              <button style={{ marginTop: 8 }} onClick={applyEdit} disabled={busy}>
                {busy ? "invalidating…" : "Apply edit"}
              </button>
              {err && <div className="err">{err}</div>}
              {invalidated && (
                <div className="chips" style={{ marginTop: 10 }}>
                  {invalidated.length === 0
                    ? <span className="muted">no nodes invalidated (field-equal cutoff)</span>
                    : invalidated.map((n) => <span key={n} className="chip cutoff">{n}</span>)}
                </div>
              )}
            </div>

            <div className="step">
              <span className="step-n"><b>2</b> re-run the dossier</span>
              <p className="hint">Only the invalidated cone recomputes; the rest is reused for free. Watch the price.</p>
              <button onClick={run} disabled={running}>{running ? "deriving…" : "Re-run dossier"}</button>
            </div>

            <Receipt receipt={receipt} />
          </div>
        </div>

        {/* PROGRESSIVE DISCLOSURE — the deep machinery, opt-in */}
        <div className="disclose">
          <details className="uh">
            <summary>
              <span><span className="uh-title">Under the hood</span> <span className="uh-sub">— all five Sibyl Memory tiers, load-bearing</span></span>
              <span className="uh-chev">›</span>
            </summary>
            <div className="uh-body">
              <div className="uh-grid">
                <FiveTier state={state} />
                <RecallPanel />
                <CommonsPanel adminToken={adminToken} />
              </div>
            </div>
          </details>

          <details className="uh">
            <summary>
              <span><span className="uh-title">Provenance &amp; time-machine</span> <span className="uh-sub">— editable pricing, on-chain anchor, recover archived derivations</span></span>
              <span className="uh-chev">›</span>
            </summary>
            <div className="uh-body">
              <div className="uh-grid">
                <DoctrineEditor adminToken={adminToken} onChanged={poll} />
                <TimeMachinePanel adminToken={adminToken} onChanged={poll} />
                <AnchorPanel adminToken={adminToken} />
              </div>
            </div>
          </details>

          <details className="uh">
            <summary>
              <span><span className="uh-title">Admin &amp; deletion test</span> <span className="uh-sub">— prove memory is load-bearing: amnesia → restore</span></span>
              <span className="uh-chev">›</span>
            </summary>
            <div className="uh-body">
              <div className="panel">
                <h3>Deletion test · admin</h3>
                <p className="hint" style={{ marginBottom: 10 }}>Rename the memory out and the dossier collapses to raw sources; restore brings it back warm, bit-for-bit.</p>
                <div className="btn-row">
                  <button className="ghost" onClick={() => admin("/amnesia")}>Amnesia (mv memory.db)</button>
                  <button className="ghost" onClick={() => admin("/amnesia", { restore: true })}>Restore</button>
                  <button className="ghost" onClick={() => admin("/reset")}>Reset</button>
                </div>
                <input placeholder="admin token" value={adminToken}
                  onChange={(e) => setAdminToken(e.target.value)} style={{ marginTop: 10 }} />
              </div>
            </div>
          </details>
        </div>
      </div>

      <footer className="foot">
        <span>Rederive · Sibyl Labs Memory Hackathon</span>
        <span className="foot-links">
          <Link className="link" href="/">Overview</Link>
          <a className="link" href="https://rederive-api.onrender.com/health" target="_blank" rel="noreferrer">API</a>
          <a className="link" href="https://sepolia.basescan.org/address/0xc211C942946011859ca634F22400d80570ED12A5" target="_blank" rel="noreferrer">On-chain</a>
        </span>
      </footer>
    </>
  );
}
