// Variant B — PIPELINE. Make "incremental compilation for cognition" literal: a left-to-right
// build pipeline (Sources → Facts → Metrics → Verdict). Edit one source and the dirty subtree
// floods across the columns while everything else stays put — reused, free. All real /report data.
"use client";
import { useState } from "react";
import Link from "next/link";
import { useReport, ReportNode } from "../../../lib/useReport";

const SOURCES = ["docs", "github", "token", "team", "community", "audits"];
const STAGES: { key: ReportNode["stage"]; n: number; head: string; sub: string }[] = [
  { key: "source", n: 1, head: "Sources", sub: "raw inputs you can edit" },
  { key: "extract", n: 2, head: "Facts", sub: "pulled from each source" },
  { key: "metric", n: 3, head: "Signals", sub: "scored Good / Fair / Weak" },
  { key: "verdict", n: 4, head: "Verdict", sub: "the final call" },
];
const val = (n?: ReportNode) => {
  const v = n?.value; if (v == null) return "—";
  if (typeof v === "string") return v;
  return v.value ?? v.risk_level ?? v.band ?? v.verdict ?? "—";
};
const tone = (s: string) => /low|strong|deep|high|full|none|distributed|positive|growing|transparent|good|promising/i.test(s) ? "good"
  : /poor|thin|weak|concentrated|declining|negative|high risk|avoid/i.test(s) ? "bad" : "mid";
const VERDICT: Record<string, string> = { good: "Good", bad: "Weak", mid: "Fair" };

export default function PipelineVariant() {
  const { rep, running, cone, edit, run, admin } = useReport();
  const [source, setSource] = useState("token");
  const [content, setContent] = useState("");
  const coneSet = new Set(cone);
  const byStage = (k: ReportNode["stage"]) => rep?.nodes.filter((n) => n.stage === k) ?? [];
  const by = (id: string) => rep?.nodes.find((n) => n.id === id);
  const verdict = by("s_verdict")?.value, score = by("s_score")?.value;
  const q = rep?.quote; const warm = (q?.derived_count ?? 0) === 0;

  return (
    <div className="lab">
      <nav className="nav">
        <span className="nav-brand"><b>RE</b>DERIVE</span>
        <span className="nav-right"><Link className="nav-link" href="/lab">variants</Link><Link className="nav-link" href="/">home</Link></span>
      </nav>
      <div className="pl-wrap">
        {/* HEADER — verdict + live cost */}
        <div className="pl-head">
          <div className="pl-verdict">
            <span className="pl-eyebrow">Due-diligence dossier · Uniswap</span>
            <h1>{verdict?.verdict ?? "—"} <span className="pl-score">{score?.overall ?? "—"}<i>/100</i></span></h1>
            <p>{verdict?.one_liner ?? ""}</p>
          </div>
          <div className={`pl-cost${warm ? " warm" : ""}`}>
            {warm
              ? <><b>$0.00</b><span>warm — all 24 reused</span></>
              : <><b>${q?.total_usd?.toFixed(2)}</b><span>{q?.derived_count} of 24 recompute · {q?.reused_count} reused free</span></>}
          </div>
        </div>

        {/* THE PIPELINE — four stages, cone floods left→right on edit */}
        <div className="pl-flow">
          {STAGES.map((st, i) => (
            <div className="pl-col" key={st.key}>
              <div className="pl-col-h"><span className="pl-num">{st.n}</span><div><b>{st.head}</b><i>{st.sub}</i></div></div>
              <div className="pl-nodes">
                {byStage(st.key).map((node) => {
                  const updating = coneSet.has(node.id);
                  const v = String(val(node));
                  return (
                    <div className={`pl-node s-${st.key}${updating ? " hot" : ""}`} key={node.id}>
                      <span className="pl-node-label">{node.label}</span>
                      {st.key === "metric" && <span className={`pl-dot t-${tone(v)}`}>{updating ? "…" : VERDICT[tone(v)]}</span>}
                      {st.key === "verdict" && <span className="pl-dot t-mid">{updating ? "…" : "set"}</span>}
                      {updating && st.key !== "metric" && st.key !== "verdict" && <span className="pl-dot t-mid">…</span>}
                    </div>
                  );
                })}
              </div>
              {i < STAGES.length - 1 && <div className="pl-arrow">→</div>}
            </div>
          ))}
        </div>

        {/* EDIT — the hero interaction */}
        <div className="pl-edit">
          <div className="pl-edit-h">Change one source — watch only its subtree rebuild</div>
          <div className="pl-edit-row">
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
            </select>
            <input placeholder={`new ${source} content…`} value={content} onChange={(e) => setContent(e.target.value)} />
            <button className="btn" onClick={() => edit(source, content)}>Change</button>
            <button className="btn ghost" onClick={run} disabled={running}>{running ? "rebuilding…" : "Rebuild"}</button>
          </div>
          {cone.length > 0 && <div className="pl-explain">Editing <b>{source}</b> dirtied <b>{cone.length}</b> conclusions — they rebuild. The other {24 - cone.length} stay cached, free.</div>}
          <div className="pl-proof">
            <button className="btn ghost sm" onClick={() => admin("/amnesia")}>Delete memory → collapses</button>
            <button className="btn ghost sm" onClick={() => admin("/amnesia", { restore: true })}>Restore → warm again</button>
          </div>
        </div>
      </div>
    </div>
  );
}
