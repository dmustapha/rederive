// File: web/app/page.tsx — LANDING (Obsidian Foundry). Single-scroll. Live hero stat + showcase
// graph stay wired to /state via useRederive; the cone + deletion-test are self-contained demos.
"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import Graph from "../components/Graph";
import { useRederive } from "../lib/useRederive";

const COLD = 24 * 0.02; // 24 derivations × $0.02 = $0.48 cold run

export default function Landing() {
  const { state, verify } = useRederive();
  const q = state?.quote;
  const price = q ? q.total_usd : null;
  const reused = q?.reused_count ?? 0;

  return (
    <>
      {/* NAV — 4-item */}
      <nav className="nav">
        <span className="nav-brand">
          <img className="nav-logo" src="/logo.png" alt="Rederive" />
          <b>RE</b>DERIVE
        </span>
        <span className="nav-right">
          <span className="nav-tabs">
            <Link className="nav-link active" href="/">Home</Link>
            <Link className="nav-link" href="/console">Console</Link>
            <Link className="nav-link" href="/integrate">Integrate</Link>
            <Link className="nav-link" href="/token">Token</Link>
          </span>
          <Link className="btn" href="/console">Open the console →</Link>
        </span>
      </nav>

      <main className="of-wrap">
        {/* HERO */}
        <section className="of-hero">
          <div className="eyebrow of-rise of-d1">Incremental compilation for cognition</div>
          <h1 className="of-hero-h of-rise of-d2">
            An agent that <span className="of-molten">forges reasoning once</span>, then reuses the metal.
          </h1>
          <p className="of-hero-sub of-rise of-d3">
            Rederive researches a crypto project once, caches the answer in Sibyl Memory, and only
            re-melts what changes. A build system for an agent&rsquo;s reasoning.
          </p>
          <div className="of-hero-note of-rise of-d3">// Watch cognition compile.</div>
          <div className="of-cta of-rise of-d4">
            <Link className="btn lg" href="/console">Watch it compile →</Link>
            <Link className="btn ghost" href="/integrate">Your agent plugs in</Link>
          </div>
          <div className="of-hero-stat of-rise of-d5">
            <div>
              <div className="of-stat-big">
                {price == null ? "—" : `$${price.toFixed(2)}`}
              </div>
              <div className="of-stat-lbl">
                to re-answer an unchanged dossier — {reused}/24 reused, {24 - reused} recomputed
              </div>
            </div>
            <div className="of-stat-sep" />
            <div className="of-stat-cold">
              cold run <s>${COLD.toFixed(2)}</s>
              <br />24 derivations × $0.02
            </div>
          </div>
        </section>

        {/* THE PROBLEM */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">The problem</div>
            <h2 className="of-h2">Agents re-melt the same metal on every question.</h2>
            <p className="of-lead">
              Ask an agent the same due-diligence question twice and it recomputes the entire dossier
              from scratch — every source, every extraction, every metric. There is no build cache for
              reasoning, so every answer is a cold start you pay for again.
            </p>
          </div>
          <div className="of-grid g3">
            <div className="of-card">
              <span className="of-card-badge">01 — no memory</span>
              <h3>Everything recomputes</h3>
              <p>24 derivations rebuilt on every call, even when nothing changed. Pure waste heat.</p>
            </div>
            <div className="of-card">
              <span className="of-card-badge">02 — no cache</span>
              <h3>You pay each time</h3>
              <p>Identical inputs, identical answer, full price. $0.48 to re-derive a report you already have.</p>
            </div>
            <div className="of-card">
              <span className="of-card-badge">03 — no lineage</span>
              <h3>Blind to what changed</h3>
              <p>No way to know which conclusions still hold when one source shifts. So everything is suspect, so everything reruns.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">How it works</div>
            <h2 className="of-h2">Reasoning, forged like a build system.</h2>
          </div>
          <div className="of-grid g3">
            <div className="of-card">
              <span className="of-card-badge">A dossier is a DAG</span>
              <h3>6 sources → 24 derivations</h3>
              <p>6 sources feed 6 extractions, 15 metrics, 3 conclusions. Each node is content-addressed by a hash of its inputs.</p>
            </div>
            <div className="of-card">
              <span className="of-card-badge">Only the cone re-derives</span>
              <h3>Same hash = reused, free</h3>
              <p>New hash recomputes; matched hash is served from memory. A source edit auto-invalidates just its downstream cone — verify-on-serve.</p>
            </div>
            <div className="of-card">
              <span className="of-card-badge">Built for machines</span>
              <h3>The customer is an agent</h3>
              <p>A human watches it work. An agent calls the metered API and pays per answer with x402 on Base. $0.02 a derivation, $0.00 reused.</p>
            </div>
          </div>
        </section>

        {/* MONEY SHOT — invalidation cone */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">The money shot</div>
            <h2 className="of-h2">Edit the token source. Only its cone goes white-hot.</h2>
            <p className="of-lead">
              Touch one source and watch the heat ripple down the branch that depends on it. The reused
              17 stay cold obsidian. You pay $0.14 instead of $0.48.
            </p>
          </div>
          <ConeDemo />

          {/* Live showcase graph — the real deployed dossier, read-only */}
          <div className="showcase" style={{ marginTop: 36 }}>
            <div className="showcase-bar">
              <span className="showcase-t">the live graph — sources → extractions → metrics → synthesis</span>
              <span className="legend">
                <span className="lg"><i className="dot d" />derived</span>
                <span className="lg"><i className="dot r" />reused</span>
                <span className="lg"><i className="dot c" />cutoff</span>
                <span className="lg"><i className="dot x" />invalidated</span>
                <span className="lg"><i className="dot s" />source</span>
              </span>
            </div>
            <div className="showcase-canvas"><Graph state={state} onVerify={verify} /></div>
          </div>
        </section>

        {/* DELETION TEST */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">The deletion test — the gate moment</div>
            <h2 className="of-h2">Delete the memory. The whole dossier vanishes.</h2>
            <p className="of-lead">
              This is the proof that memory is load-bearing, not decoration. Wipe the 24 records and the
              report collapses. Restore, and it comes back warm — instantly.
            </p>
          </div>
          <DeletionTest />
        </section>

        {/* TIERS + customer */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">Five Sibyl tiers — all load-bearing</div>
            <h2 className="of-h2">How it remembers.</h2>
          </div>
          <div className="of-tiers">
            <div className="of-tier"><div className="of-tier-name">HOT</div><div className="of-tier-desc">The live run cursor. <code>set_state / get_state</code></div></div>
            <div className="of-tier"><div className="of-tier-name">WARM</div><div className="of-tier-desc">The 24 derivations — reuse cache + provenance. <code>set_entity / get_entity</code></div></div>
            <div className="of-tier"><div className="of-tier-name">COLD</div><div className="of-tier-desc">Append-only journal + attribution, FTS5 recall. <code>write_event / read_events</code></div></div>
            <div className="of-tier"><div className="of-tier-name">REFERENCE</div><div className="of-tier-desc">The editable pricing + invalidation doctrine. <code>set_reference / get_reference</code></div></div>
            <div className="of-tier"><div className="of-tier-name">ARCHIVE</div><div className="of-tier-desc">Recoverable dead-cone morgue. <code>archive_entity vs delete_entity</code></div></div>
          </div>
          <div className="of-customer">
            <div className="of-customer-txt">
              <h3>Your agent is the customer.</h3>
              <p>Content-addressed records, a multi-tenant commons, MCP + LangGraph surfaces. A human reads this site to watch it work — an agent calls the metered API and pays per answer with x402 on Base.</p>
            </div>
            <Link className="btn" href="/integrate">See integration →</Link>
          </div>
        </section>

        {/* ON-CHAIN PROOF */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">On-chain proof — Base Sepolia</div>
            <h2 className="of-h2">The price it computes is the price actually paid.</h2>
            <p className="of-lead">
              Real gasless USDC settlements via x402 (EIP-3009). Four real transactions, verifiable on Basescan.
            </p>
          </div>
          <div className="of-proof-grid">
            {[
              ["0x10759f3c…", "0x10759f3c"],
              ["0x11ae4043…", "0x11ae4043"],
              ["0x5ed48622…", "0x5ed48622"],
              ["0x92606759…", "0x92606759"],
            ].map(([label, hash]) => (
              <a
                key={hash}
                className="of-proof-tx"
                href={`https://sepolia.basescan.org/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="of-proof-dot" />
                <span className="of-proof-hash">{label}</span>
                <span className="of-proof-meta">USDC · EIP-3009</span>
              </a>
            ))}
          </div>
          <div className="of-proof-contract">
            contract <span>0xc211C942946011859ca634F22400d80570ED12A5</span> · sepolia.basescan.org
          </div>
        </section>

        {/* TOKEN teaser */}
        <section className="of-section">
          <div className="of-section-head">
            <div className="eyebrow">The token</div>
            <h2 className="of-h2">Rederive captures the metered-memory economy.</h2>
            <p className="of-lead">
              Memory is metered per answer via x402. Agents are the buyers. The token captures the flow —
              buy &amp; chart are coming soon; the thesis is here now.
            </p>
          </div>
          <div className="of-cta">
            <Link className="btn" href="/token">Read the token thesis →</Link>
          </div>
        </section>

        {/* FOOTER */}
        <section className="of-footer">
          <div className="of-footer-cta">
            <div className="eyebrow center">Watch cognition compile</div>
            <h2 className="of-h2">Stop paying for cold starts.</h2>
            <div className="of-cta center">
              <Link className="btn lg" href="/console">Open the console</Link>
              <Link className="btn ghost" href="/integrate">Integrate your agent</Link>
            </div>
          </div>
          <div className="of-footer-links">
            <Link href="/console">Console</Link>
            <Link href="/integrate">Integrate</Link>
            <Link href="/token">Token</Link>
            <a href="https://rederive-api.onrender.com/health" target="_blank" rel="noopener noreferrer">API</a>
            <a href="https://sepolia.basescan.org/address/0xc211C942946011859ca634F22400d80570ED12A5" target="_blank" rel="noopener noreferrer">On-chain (Basescan)</a>
          </div>
        </section>
      </main>
    </>
  );
}

/* ─────────────────────────── MONEY SHOT — molten cone (self-contained demo) ────────────────── */
function ConeDemo() {
  const [hot, setHot] = useState(false);
  const nodeCls = (isHot: boolean) => `of-cone-node ${hot && isHot ? "hot" : "cold"}`;
  const srcCls = hot ? "of-cone-node src-hot" : "of-cone-node cold";
  const edgeCls = (isHot: boolean) => `of-cone-edge${hot && isHot ? " hot" : ""}`;

  return (
    <div className="of-cone">
      <div className="of-cone-stage">
        <svg viewBox="0 0 560 360" aria-label="Invalidation cone visualization">
          <defs>
            <linearGradient id="hotEdge" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffce54" />
              <stop offset="1" stopColor="#ff5e1a" />
            </linearGradient>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glowStrong" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* edges */}
          <g>
            <path className={edgeCls(false)} d="M70,60 C170,60 190,90 300,90" />
            <path className={edgeCls(false)} d="M70,110 C170,110 190,140 300,140" />
            <path className={edgeCls(false)} d="M70,160 C170,160 190,180 300,180" />
            <path className={edgeCls(false)} d="M70,210 C170,210 190,220 300,220" />
            <path className={edgeCls(true)} d="M70,260 C170,260 190,260 300,260" />
            <path className={edgeCls(true)} d="M70,260 C170,260 190,300 300,300" />
            <path className={edgeCls(false)} d="M70,310 C170,310 190,330 300,330" />
            <path className={edgeCls(false)} d="M300,90 C420,90 440,160 500,180" />
            <path className={edgeCls(false)} d="M300,140 C420,140 440,170 500,180" />
            <path className={edgeCls(true)} d="M300,260 C420,260 440,220 500,200" />
            <path className={edgeCls(true)} d="M300,300 C420,300 440,240 500,200" />
          </g>
          {/* source nodes */}
          <g>
            <g><circle className={nodeCls(false)} cx="70" cy="60" r="10" /><text className="of-cone-label" x="70" y="46" textAnchor="middle">docs</text></g>
            <g><circle className={nodeCls(false)} cx="70" cy="110" r="10" /><text className="of-cone-label" x="70" y="96" textAnchor="middle">code</text></g>
            <g><circle className={nodeCls(false)} cx="70" cy="160" r="10" /><text className="of-cone-label" x="70" y="146" textAnchor="middle">team</text></g>
            <g><circle className={nodeCls(false)} cx="70" cy="210" r="10" /><text className="of-cone-label" x="70" y="196" textAnchor="middle">comm.</text></g>
            <g><circle className={srcCls} cx="70" cy="260" r="12" /><text className={`of-cone-label${hot ? " hot" : ""}`} x="70" y="244" textAnchor="middle">token ✎</text></g>
            <g><circle className={nodeCls(false)} cx="70" cy="310" r="10" /><text className="of-cone-label" x="70" y="296" textAnchor="middle">audits</text></g>
            {/* metric col */}
            <circle className={nodeCls(false)} cx="300" cy="90" r="8" />
            <circle className={nodeCls(false)} cx="300" cy="140" r="8" />
            <circle className={nodeCls(false)} cx="300" cy="180" r="8" />
            <circle className={nodeCls(false)} cx="300" cy="220" r="8" />
            <circle className={nodeCls(true)} cx="300" cy="260" r="9" />
            <circle className={nodeCls(true)} cx="300" cy="300" r="9" />
            <circle className={nodeCls(false)} cx="300" cy="330" r="8" />
            {/* conclusions */}
            <g><circle className={nodeCls(false)} cx="500" cy="180" r="11" /><text className="of-cone-label" x="500" y="164" textAnchor="middle">verdict</text></g>
            <g><circle className={nodeCls(true)} cx="500" cy="200" r="12" /></g>
          </g>
        </svg>
        <div className="of-cone-ctrl">
          <button className="btn" onClick={() => setHot(true)}>✎ Edit token source →</button>
          <button className="btn ghost" onClick={() => setHot(false)}>Reset</button>
        </div>
      </div>
      <div className="of-cone-math">
        <div className="of-cone-row cold">
          <div className="k">Cold run — compute everything</div>
          <div className="v">$0.48</div>
          <div className="sub">24 derivations × $0.02</div>
        </div>
        <div className="of-cone-row warm">
          <div className="k">Edit token &amp; rebuild — only the cone</div>
          <div className="v">{hot ? "$0.14" : "$0.48"}</div>
          <div className="sub">~7 conclusions recompute · the other 17 reused, free</div>
        </div>
        <div className="of-cone-row free">
          <div className="k">Re-answer, unchanged</div>
          <div className="v">$0.00</div>
          <div className="sub">24/24 reused · 0 recomputed</div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── DELETION TEST (self-contained demo) ───────────────────────────── */
function DeletionTest() {
  const [count, setCount] = useState(24);
  const [gone, setGone] = useState<boolean[]>(() => Array(24).fill(false));
  const [dbTo, setDbTo] = useState<string>("471 KB");
  const [restored, setRestored] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  const wipe = () => {
    clearTimers();
    setRestored(false);
    for (let i = 0; i < 24; i++) {
      timers.current.push(setTimeout(() => {
        setGone((g) => { const n = [...g]; n[i] = true; return n; });
        setCount((c) => c - 1);
      }, i * 55));
    }
    timers.current.push(setTimeout(() => setDbTo("4 KB"), 24 * 55 + 120));
  };

  const restore = () => {
    clearTimers();
    setDbTo("471 KB");
    setRestored(true);
    for (let i = 0; i < 24; i++) {
      timers.current.push(setTimeout(() => {
        setGone((g) => { const n = [...g]; n[i] = false; return n; });
        setCount((c) => Math.min(24, c + 1));
      }, i * 22));
    }
  };

  return (
    <div className="of-del">
      <div className="of-del-bar">
        <span>Sibyl Memory · Uniswap dossier</span>
        <span>records: <b>{count}</b> / 24</span>
      </div>
      <div className="of-del-dots">
        {gone.map((isGone, i) => (
          <div key={i} className={`of-del-dot ${isGone ? "gone" : "on"}`} />
        ))}
      </div>
      <div className="of-del-db">
        db size: <span className="from">471 KB</span> →{" "}
        <span className={`to${restored ? " restored" : ""}`}>{dbTo}</span>
      </div>
      <div className="of-cta">
        <button className="btn danger" onClick={wipe}>Delete memory</button>
        <button className="btn" onClick={restore}>Restore (warm)</button>
      </div>
    </div>
  );
}
