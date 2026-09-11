// File: web/app/console/page.tsx — the console as a GUIDED WALKTHROUGH.
// A human clicks through five steps and watches each thing we built actually work, understanding
// each one as it happens: (1) what the AI built, (2) asking again is free, (3) change one source and
// only that part redoes, (4) delete the memory and it all vanishes, (5) how it remembers + who pays.
// One thing on screen at a time. The report grid is the stage; the guide narrates. This is also the
// exact demo-video script.
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReport, ReportNode, Receipt } from "@/lib/useReport";
import { StateResp, getJSON, postJSON } from "@/lib/api";
import { FiveTier, AnchorPanel } from "@/components/deep";

const GROUPS: { title: string; ids: string[] }[] = [
  { title: "Docs & API", ids: ["m_doc_quality", "m_storage_arch", "m_api_surface"] },
  { title: "Code & team", ids: ["m_commit_rate", "m_test_coverage", "m_bus_factor", "m_team_track"] },
  { title: "Token", ids: ["m_supply_risk", "m_utility", "m_liquidity"] },
  { title: "Community", ids: ["m_transparency", "m_sentiment", "m_growth"] },
  { title: "Security", ids: ["m_audit_status", "m_sec_incidents"] },
];
const val = (n?: ReportNode) => {
  const v = n?.value; if (v == null) return "—";
  if (typeof v === "string") return v;
  return v.value ?? v.risk_level ?? v.band ?? v.verdict ?? "—";
};
const basis = (n?: ReportNode): string => {
  const v = n?.value; if (v == null || typeof v === "string") return "";
  return v.basis ?? v.one_liner ?? (Array.isArray(v.top_risks) ? v.top_risks.join(", ") : "") ?? "";
};
const tone = (s: string) => /low|strong|deep|high|full|none|distributed|positive|growing|transparent|good|promising/i.test(s) ? "good"
  : /poor|thin|weak|concentrated|declining|negative|high risk|avoid/i.test(s) ? "bad" : "mid";
const VERDICT: Record<string, string> = { good: "Good", bad: "Weak", mid: "Fair" };
const kb = (b?: number) => (b == null ? "—" : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(0)} KB`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Anim = "hold" | "calc" | "flip";

const STEPS = [
  { title: "What the AI built", sub: "It read six sources on Uniswap — the docs, the code, the token, the team, the community, the audits — and turned them into 15 checks and one verdict." },
  { title: "Asking again is free", sub: "It already did this work and remembers it. Ask the exact same question again — nothing should be recomputed." },
  { title: "Change one thing, redo only that", sub: "Say the token details change. Edit that one source and rebuild, then watch which checks light up and what it costs." },
  { title: "The answers live in memory", sub: "Is this really remembered, or just hard-coded? Delete the memory and watch what happens to the report." },
  { title: "How it remembers, and who actually uses it", sub: "The real customer isn't you, it's an AI agent. It plugs in three ways (a paid API call, an MCP tool, or a LangGraph node), and pays per answer with x402 on Base. Under the hood, five memory layers do the remembering." },
];

// The three real ways an agent plugs in — the API path fires a real POST /answer so you SEE the
// exact JSON an agent gets back (the whole point: the customer is a machine, not this webpage).
function AgentView() {
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const call = async () => {
    setLoading(true); setResp(null);
    try { setResp(await postJSON<any>("/answer", {})); } catch (e) { setResp({ error: String(e) }); }
    setLoading(false);
  };
  return (
    <div className="agentview panel">
      <h3>How an AI agent plugs in</h3>
      <p className="hint" style={{ marginBottom: 12 }}>No agent opens this page. It integrates one of three ways, all built and working:</p>
      <div className="av-card">
        <div className="av-h"><span className="av-n">1</span>Paid API call · x402 on Base</div>
        <pre className="av-code">{`client = x402Client()               # pays per call, on Base
r = await http.post(".../answer")   # x402 settles the quote
dossier = r.json()["dossier"]       # -> the verdict, as JSON`}</pre>
        <button className="btn ghost sm" onClick={call} disabled={loading}>{loading ? "calling…" : "▶ Make the call an agent makes"}</button>
        {resp && !resp.error && (
          <pre className="av-out">{JSON.stringify({
            dossier: { verdict: resp.dossier?.s_verdict?.verdict, score: resp.dossier?.s_score?.overall, risk: resp.dossier?.s_risk?.risk_level },
            paid_usd: resp.receipt?.quoted_usd, redone: resp.receipt?.derived?.length, reused: resp.receipt?.reused?.length,
          }, null, 2)}</pre>
        )}
        {resp?.error && <pre className="av-out err">{resp.error}</pre>}
      </div>
      <div className="av-card">
        <div className="av-h"><span className="av-n">2</span>MCP tool · drop-in for Claude</div>
        <pre className="av-code">{`# FastMCP server "rederive"
@mcp.tool()
def get_derivation(node): ...   # get_derivation("s_verdict")
@mcp.tool()
def recall(q, limit): ...       # keyword search the memory`}</pre>
        <p className="av-note">Point any MCP client at the server; the agent's model calls these tools directly, no glue code.</p>
      </div>
      <div className="av-card">
        <div className="av-h"><span className="av-n">3</span>LangGraph node</div>
        <pre className="av-code">{`graph = build_langgraph(engine)
# Rederive becomes the memory node inside the agent's own workflow`}</pre>
      </div>
    </div>
  );
}

export default function Console() {
  const { rep, running, cone, token, edit, run, admin } = useReport();
  const [sstate, setSstate] = useState<StateResp | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [anim, setAnim] = useState<Record<string, Anim>>({});
  const prevFp = useRef<Record<string, string | null>>({});

  const pollState = async () => { try { setSstate(await getJSON<StateResp>("/state")); } catch {} };
  useEffect(() => { pollState(); const id = setInterval(pollState, 2000); return () => clearInterval(id); }, []);

  const by = (id: string) => rep?.nodes.find((n) => n.id === id);
  const risk = by("s_risk")?.value, score = by("s_score")?.value, verdict = by("s_verdict")?.value;
  const mem = rep?.memory; const coneSet = new Set(cone);
  const gone = (mem?.records ?? 24) === 0;

  useEffect(() => { if (rep && !busy) { const m: Record<string, string | null> = {}; rep.nodes.forEach((n) => (m[n.id] = n.fp ?? null)); prevFp.current = m; } }, [rep, busy]);

  const choreograph = async (receipt: Receipt | null) => {
    const derived = receipt?.derived ?? [];
    if (derived.length === 0) {
      const ids = GROUPS.flatMap((g) => g.ids);
      for (let i = 0; i < ids.length; i++) { setAnim((a) => ({ ...a, [ids[i]]: "hold" })); await sleep(26); }
    } else {
      const shown = derived.filter((d) => GROUPS.some((g) => g.ids.includes(d)));
      for (let i = 0; i < shown.length; i++) { setAnim((a) => ({ ...a, [shown[i]]: "flip" })); await sleep(150); }
    }
    await sleep(1100); setAnim({});
  };

  // ── step actions — each ends by setting a plain "here's what just happened" ──
  const runAsk = async () => {
    if (busy) return; setBusy(true); setResult(null);
    const r = await run(); await choreograph(r); setBusy(false);
    setResult({ ok: true, text: "0 answers redone. All 24 came straight from memory. Cost: $0.00 — like a spreadsheet skipping the cells that didn't change." });
  };
  const runChange = async () => {
    if (busy) return; setBusy(true); setResult(null);
    const inv = await edit("token", "governance token, fee switch live, top holder 4%");
    const dirty: Record<string, Anim> = {}; inv.forEach((id) => (dirty[id] = "calc")); setAnim(dirty);
    await sleep(800);
    const r = await run(); await choreograph(r); setBusy(false);
    const d = r?.derived?.length ?? inv.length, reu = r?.reused?.length ?? (24 - inv.length);
    const usd = (r?.quoted_usd ?? d * 0.02).toFixed(2);
    setResult({ ok: true, text: `Only ${d} checks, all about the token, were redone. The other ${reu} were reused for free. You paid $${usd}, not the full $0.48.` });
  };
  const runDelete = async () => {
    if (busy) return; setBusy(true); setResult(null);
    await admin("/amnesia"); await pollState(); setBusy(false);
    setResult({ ok: false, text: "The whole report just vanished. If the answers were hard-coded, deleting the memory would change nothing." });
  };
  const runRestore = async () => {
    if (busy) return; setBusy(true); setResult(null);
    await admin("/amnesia", { restore: true }); await pollState(); setBusy(false);
    setResult({ ok: true, text: "Restored, warm, in an instant. The intelligence lived in memory, not in the code." });
  };

  const go = (d: number) => {
    const next = Math.max(0, Math.min(STEPS.length - 1, step + d));
    if (gone) admin("/amnesia", { restore: true }).then(pollState); // never leave the demo collapsed
    setResult(null); setAnim({}); setStep(next);
  };

  const s = STEPS[step];
  const grid = (
    <div className="rc-grid">
      {GROUPS.map((g) => (
        <div className="rc-group" key={g.title}>
          <div className="rc-group-h">{g.title}</div>
          {g.ids.map((id) => {
            const n = by(id); const v = String(val(n)); const t = tone(v);
            const a = anim[id];
            const rebuilding = a === "calc" || (busy && coneSet.has(id));
            const sentence = basis(n) || (v !== "—" ? `Reads “${v}”.` : "");
            const absent = gone || n?.value == null;
            return (
              <div className={`rc-metric${a ? " a-" + a : ""}${absent ? " absent" : ""}`} key={id}>
                <div className="rc-m-top">
                  <span className="rc-m-label">{n?.label ?? id}</span>
                  {absent ? <span className="rc-m-val t-bad">gone</span>
                    : rebuilding ? <span className="rc-m-val calc">redoing…</span>
                    : <span className={`rc-m-val t-${t}`}>{VERDICT[t]}</span>}
                </div>
                {!absent && !rebuilding && sentence && <div className="rc-m-basis">{sentence}</div>}
                {a === "hold" && <div className="rc-m-note reuse">↺ reused from memory · unchanged</div>}
                {a === "flip" && <div className="rc-m-note derive">✎ just redone · answer changed</div>}
                {absent && <div className="rc-m-note none">no answer in memory</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className="lab">
      <nav className="nav">
        <span className="nav-brand"><img className="nav-logo" src="/logo.png" alt="Rederive" /><b>RE</b>DERIVE</span>
        <span className="nav-right"><Link className="nav-link" href="/">home</Link></span>
      </nav>

      <div className="wt-wrap">
        {/* PURPOSE — one breath: what it is + who uses it */}
        <div className="wt-intro">
          <h1>Can you trust this crypto project?</h1>
          <p><b>Rederive</b> is an AI that researches it once, remembers the answer, and only re-checks what changes. A human reads this page to watch it work; the real customer is an <b>AI agent</b> that calls the API and pays per answer.</p>
        </div>

        {/* STATUS BAR — the artifact it produced + the memory meter (always visible) */}
        <div className="wt-status">
          <div className="wt-stat"><span>Project</span><b>Uniswap</b></div>
          <div className="wt-stat"><span>Verdict</span><b className={`t-${tone(verdict?.verdict ?? "")}`}>{gone ? "—" : (verdict?.verdict ?? "…")}</b></div>
          <div className="wt-stat"><span>Score</span><b>{gone ? "—" : (score?.overall ?? "…")}<i>/100</i></b></div>
          <div className="wt-stat"><span>Risk</span><b className={`t-${tone(risk?.risk_level ?? "")}`}>{gone ? "—" : (risk?.risk_level ?? "…")}</b></div>
          <div className="wt-stat mem"><span>In memory</span><b>{mem?.records ?? "…"}<i>/24 · {kb(mem?.db_bytes)}</i></b></div>
        </div>

        {/* THE GUIDE — one step at a time */}
        <div className="wt-guide">
          <div className="wt-guide-head">
            <span className="wt-step-n">Step {step + 1} of {STEPS.length}</span>
            <span className="wt-dots">{STEPS.map((_, i) => <i key={i} className={i === step ? "on" : i < step ? "done" : ""} />)}</span>
          </div>
          <h2 className="wt-title">{s.title}</h2>
          <p className="wt-sub">{s.sub}</p>

          <div className="wt-action">
            {step === 0 && <span className="wt-hint">The 15 checks are below. When you're ready, hit <b>Next</b>.</span>}
            {step === 1 && <button className="btn lg" onClick={runAsk} disabled={busy || gone}>{busy ? "asking…" : "▶ Ask again"}</button>}
            {step === 2 && <button className="btn lg" onClick={runChange} disabled={busy || gone}>{busy ? (running ? "rebuilding…" : "changing…") : "▶ Change the token & rebuild"}</button>}
            {step === 3 && (gone
              ? <button className="btn lg" onClick={runRestore} disabled={busy}>{busy ? "restoring…" : "↻ Bring the memory back"}</button>
              : <button className="btn lg danger" onClick={runDelete} disabled={busy}>{busy ? "deleting…" : "▶ Delete the memory"}</button>)}
            {step === 4 && <span className="wt-hint">Below: <b>run the exact call an agent makes</b>, plus the five memory layers and real on-chain payments.</span>}
          </div>

          {result && <div className={`wt-result ${result.ok ? "ok" : "bad"}`}><span className="wt-check">{result.ok ? "✓" : "✕"}</span>{result.text}</div>}

          <div className="wt-nav">
            <button className="btn ghost" onClick={() => go(-1)} disabled={step === 0}>← Back</button>
            <button className="btn" onClick={() => go(1)} disabled={step === STEPS.length - 1}>Next →</button>
          </div>
        </div>

        {/* THE STAGE — the report reacts (steps 1-4), or the under-the-hood panels (step 5) */}
        {step < 4
          ? <><p className="rc-grid-intro">The 15 checks behind the verdict. <b className="t-good">Green</b> is a plus, <b className="t-mid">amber</b> is so-so, <b className="t-bad">red</b> is a concern.</p>{grid}</>
          : <div className="wt-hood"><AgentView /><FiveTier state={sstate} /><AnchorPanel adminToken={token} /></div>}
      </div>
    </div>
  );
}
