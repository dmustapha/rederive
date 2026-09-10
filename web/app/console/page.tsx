// File: web/app/console/page.tsx — the operator console, built as a MEMORY INSTRUMENT.
// The whole thesis of the project is that memory is load-bearing, so the console lets the judge run
// three experiments and watch memory do the work — reuse (same fingerprint), incremental re-derive
// (new fingerprint on the cone only), and the deletion test (collapse → restore). The deep Sibyl
// integrations (five tiers, FTS5 recall, on-chain x402 anchor, time-machine, doctrine) sit behind
// progressive disclosure so the surface stays instantly legible.
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReport, ReportNode, Receipt } from "@/lib/useReport";
import { StateResp, getJSON } from "@/lib/api";
import { FiveTier, DoctrineEditor, RecallPanel, CommonsPanel, TimeMachinePanel, AnchorPanel } from "@/components/deep";

const SOURCES = ["docs", "github", "token", "team", "community", "audits"];
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
const fp8 = (fp?: string | null) => (fp ? fp.slice(0, 7) : "—");
const kb = (b?: number) => (b == null ? "—" : b < 1024 ? `${b} B` : `${(b / 1024).toFixed(0)} KB`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Anim = "hold" | "calc" | "flip";

export default function Console() {
  const { rep, running, cone, token, poll, edit, run, admin } = useReport();
  const [sstate, setSstate] = useState<StateResp | null>(null);
  const [source, setSource] = useState("token");
  const content = "gov token, fee switch live, top holder 4%";      // deterministic edit for the demo
  const [anim, setAnim] = useState<Record<string, Anim>>({});
  const [ledger, setLedger] = useState<{ t: string; k: "reuse" | "derive" | "delete" | "edit" }[]>([]);
  const [busy, setBusy] = useState(false);
  const prevFp = useRef<Record<string, string | null>>({});

  const pollState = async () => { try { setSstate(await getJSON<StateResp>("/state")); } catch {} };
  useEffect(() => { pollState(); const id = setInterval(pollState, 2000); return () => clearInterval(id); }, []);

  const by = (id: string) => rep?.nodes.find((n) => n.id === id);
  const risk = by("s_risk")?.value, score = by("s_score")?.value, verdict = by("s_verdict")?.value;
  const mem = rep?.memory; const coneSet = new Set(cone);
  const gone = (mem?.records ?? 24) === 0;

  useEffect(() => { if (rep && !busy) { const m: Record<string, string | null> = {}; rep.nodes.forEach((n) => (m[n.id] = n.fp ?? null)); prevFp.current = m; } }, [rep, busy]);
  const log = (t: string, k: "reuse" | "derive" | "delete" | "edit") => setLedger((l) => [{ t, k }, ...l].slice(0, 6));

  const choreograph = async (receipt: Receipt | null) => {
    const derived = receipt?.derived ?? [], reused = receipt?.reused ?? [];
    if (derived.length === 0) {
      const ids = GROUPS.flatMap((g) => g.ids);
      for (let i = 0; i < ids.length; i++) { setAnim((a) => ({ ...a, [ids[i]]: "hold" })); await sleep(28); }
      log(`Reused all 24 answers from memory · $0.00 · nothing redone`, "reuse");
    } else {
      const shown = derived.filter((d) => GROUPS.some((g) => g.ids.includes(d)));
      for (let i = 0; i < shown.length; i++) { setAnim((a) => ({ ...a, [shown[i]]: "flip" })); await sleep(160); }
      log(`Redid ${derived.length} answers · $${(receipt?.quoted_usd ?? derived.length * 0.02).toFixed(2)}`, "derive");
      log(`Reused the other ${reused.length} from memory · $0.00`, "reuse");
    }
    await sleep(900); setAnim({}); pollState();
  };

  const doReask = async () => { if (busy) return; setBusy(true); const r = await run(); await choreograph(r); setBusy(false); };
  const doEdit = async () => {
    const inv = await edit(source, content);
    log(`Changed ${source} → ${inv.length} answers now need redoing`, "edit");
    const dirty: Record<string, Anim> = {}; inv.forEach((id) => (dirty[id] = "calc")); setAnim(dirty);
  };
  const doRederive = async () => { if (busy) return; setBusy(true); const r = await run(); await choreograph(r); setBusy(false); };
  const doDelete = async () => { if (busy) return; setBusy(true); await admin("/amnesia"); log(`Memory deleted · all 24 answers gone`, "delete"); pollState(); setBusy(false); };
  const doRestore = async () => { if (busy) return; setBusy(true); await admin("/amnesia", { restore: true }); log(`Memory restored · all 24 answers back · free`, "reuse"); pollState(); setBusy(false); };

  return (
    <div className="lab">
      <nav className="nav">
        <span className="nav-brand"><b>RE</b>DERIVE</span>
        <span className="nav-right"><Link className="nav-link" href="/">home</Link></span>
      </nav>
      <div className="rc-wrap">
        <div className="rc-head">
          <div>
            <div className="rc-eyebrow">Trust report · Uniswap · everything here is remembered, not recomputed</div>
            <h1 className="rc-verdict">{gone ? "no memory" : (verdict?.verdict ?? "—")}</h1>
            <p className="rc-oneliner">{gone ? "The report is gone. Its answers lived in memory, not in the code." : (verdict?.one_liner ?? "")}</p>
          </div>
          <div className="rc-badges">
            <div className="rc-badge"><span>Score</span><b>{gone ? "—" : (score?.overall ?? "—")}<i>/100</i></b></div>
            <div className="rc-badge"><span>Risk</span><b className={`t-${tone(risk?.risk_level ?? "")}`}>{gone ? "—" : (risk?.risk_level ?? "—")}</b></div>
          </div>
        </div>

        <div className={`rc-gauge${gone ? " empty" : ""}`}>
          <div className="rc-gauge-bar"><span style={{ width: `${((mem?.records ?? 0) / (mem?.expected ?? 24)) * 100}%` }} /></div>
          <div className="rc-gauge-txt">
            <b>{mem?.records ?? "—"}<i> / {mem?.expected ?? 24}</i></b> answers in memory
            <span className="rc-gauge-size">· {kb(mem?.db_bytes)} on disk</span>
          </div>
        </div>

        <div className="rc-grid">
          {GROUPS.map((g) => (
            <div className="rc-group" key={g.title}>
              <div className="rc-group-h">{g.title}</div>
              {g.ids.map((id) => {
                const n = by(id); const v = String(val(n)); const t = tone(v);
                const a = anim[id]; const updating = a === "calc" || coneSet.has(id);
                const sentence = basis(n) || (v !== "—" ? `Reads “${v}”.` : "");
                const absent = gone || n?.value == null;
                return (
                  <div className={`rc-metric${a ? " a-" + a : ""}${absent ? " absent" : ""}`} key={id}>
                    <div className="rc-m-top">
                      <span className="rc-m-label">{n?.label ?? id}</span>
                      {absent ? <span className="rc-m-val t-bad">gone</span>
                        : <span className={`rc-m-val t-${t}`}>{updating ? "computing…" : VERDICT[t]}</span>}
                    </div>
                    {!absent && !updating && sentence && <div className="rc-m-basis">{sentence}</div>}
                    <div className="rc-m-fp">
                      {absent ? <span className="fp none">no record</span>
                        : <><span className={`fp ${a === "flip" ? "new" : a === "hold" ? "same" : ""}`} title="a short code that only changes when this answer changes">#{fp8(n?.fp)}</span>
                          {a === "hold" && <span className="fp-tag reuse">reused · code unchanged</span>}
                          {a === "flip" && <span className="fp-tag derive">redone · code changed</span>}
                          {n?.verified === "MATCH" && !a && <span className="fp-tag ok">✓ double-checked</span>}</>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* EXPERIMENTS — three claims, run by the judge */}
        <div className="rc-lab">
          <div className="rc-exp">
            <div className="rc-exp-h"><span className="rc-exp-n">1</span>Nothing changed? Ask again</div>
            <p>Ask the same question again. Nothing changed, so nothing should be redone. Watch the price stay <b>$0.00</b> and every answer come straight from memory.</p>
            <button className="btn" onClick={doReask} disabled={busy || gone}>{busy ? "…" : "Ask again"}</button>
          </div>
          <div className="rc-exp">
            <div className="rc-exp-h"><span className="rc-exp-n">2</span>Change one source</div>
            <p>Edit a source and rebuild. Only the answers that <b>depend on it</b> are redone; everything else stays exactly as it was, for free.</p>
            <div className="rc-exp-row">
              <select value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select>
              <button className="btn ghost" onClick={doEdit} disabled={busy || gone}>Edit</button>
              <button className="btn" onClick={doRederive} disabled={busy || gone || cone.length === 0}>{running ? "redoing…" : `Rebuild${cone.length ? ` (${cone.length})` : ""}`}</button>
            </div>
          </div>
          <div className="rc-exp danger">
            <div className="rc-exp-h"><span className="rc-exp-n">3</span>Does the memory really matter?</div>
            <p>Delete the memory. If the answers were <b>hard-coded</b>, nothing would change. Instead the whole report disappears, then Restore brings it back.</p>
            <div className="rc-exp-row">
              <button className="btn ghost" onClick={doDelete} disabled={busy || gone}>Delete memory</button>
              <button className="btn" onClick={doRestore} disabled={busy || !gone}>Restore</button>
            </div>
          </div>
        </div>

        {ledger.length > 0 && (
          <div className="rc-ledger">
            <div className="rc-ledger-h">Memory activity</div>
            {ledger.map((e, i) => <div className={`rc-ledger-row k-${e.k}`} key={i}><span className="dot" />{e.t}</div>)}
          </div>
        )}

        {/* PROGRESSIVE DISCLOSURE — the deep Sibyl integrations, opt-in */}
        <div className="disclose">
          <details className="uh">
            <summary><span><span className="uh-title">How it remembers</span> <span className="uh-sub">— the five Sibyl memory layers, and keyword search across them</span></span><span className="uh-chev">›</span></summary>
            <div className="uh-body"><div className="uh-grid"><FiveTier state={sstate} /><RecallPanel /></div></div>
          </details>
          <details className="uh">
            <summary><span><span className="uh-title">Proof on the blockchain</span> <span className="uh-sub">— real per-answer payments on Base, editable pricing, recover old answers</span></span><span className="uh-chev">›</span></summary>
            <div className="uh-body"><div className="uh-grid"><AnchorPanel adminToken={token} /><DoctrineEditor adminToken={token} onChanged={poll} /><TimeMachinePanel adminToken={token} onChanged={poll} /></div></div>
          </details>
          <details className="uh">
            <summary><span><span className="uh-title">Shared memory</span> <span className="uh-sub">— what other AIs have already worked out, reused across the network</span></span><span className="uh-chev">›</span></summary>
            <div className="uh-body"><div className="uh-grid"><CommonsPanel adminToken={token} /></div></div>
          </details>
        </div>
      </div>
    </div>
  );
}
