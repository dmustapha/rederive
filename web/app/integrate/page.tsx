// File: web/app/integrate/page.tsx — INTEGRATE. "Your agent is the customer" docs.
// No agent opens a webpage — it integrates one of three ways (paid API call, MCP tool, LangGraph
// node), all built and working, and pays per answer with x402 on Base. The API path fires a REAL
// POST /answer so you SEE the exact JSON an agent gets back. Obsidian Foundry, contract classes only.
"use client";
import { useState } from "react";
import Link from "next/link";
import { postJSON } from "@/lib/api";

// The four real Base Sepolia settlements (x402 · EIP-3009 gasless USDC).
const TXS = ["0x10759f3c", "0x11ae4043", "0x5ed48622", "0x92606759"];
const CONTRACT = "0xc211C942946011859ca634F22400d80570ED12A5";

// The live "run the call an agent makes" panel — reuses the exact console AgentView logic.
function LiveCall() {
  const [resp, setResp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const call = async () => {
    setLoading(true);
    setResp(null);
    try {
      setResp(await postJSON<any>("/answer", {}));
    } catch (e) {
      setResp({ error: String(e) });
    }
    setLoading(false);
  };
  return (
    <>
      <button className="btn ghost sm" onClick={call} disabled={loading}>
        {loading ? "calling…" : "▶ Make the call an agent makes"}
      </button>
      {resp && !resp.error && (
        <pre className="av-out">
          {JSON.stringify(
            {
              dossier: {
                verdict: resp.dossier?.s_verdict?.verdict,
                score: resp.dossier?.s_score?.overall,
                risk: resp.dossier?.s_risk?.risk_level,
              },
              paid_usd: resp.receipt?.quoted_usd,
              redone: resp.receipt?.derived?.length,
              reused: resp.receipt?.reused?.length,
            },
            null,
            2
          )}
        </pre>
      )}
      {resp?.error && <pre className="av-out err">{resp.error}</pre>}
    </>
  );
}

export default function Integrate() {
  return (
    <>
      {/* NAV — 4-item pill, matches other pages */}
      <nav className="nav">
        <span className="nav-brand">
          <img className="nav-logo" src="/logo.png" alt="Rederive" />
          <b>RE</b>DERIVE
        </span>
        <span className="nav-right">
          <span className="nav-tabs">
            <Link className="nav-link" href="/">Home</Link>
            <Link className="nav-link" href="/console">Console</Link>
            <Link className="nav-link active" href="/integrate">Integrate</Link>
            <Link className="nav-link" href="/token">Token</Link>
          </span>
          <Link className="btn" href="/console">Open the console →</Link>
        </span>
      </nav>

      <div className="of-wrap">
        {/* HEADER */}
        <section className="of-section flush">
          <div className="of-section-head">
            <div className="eyebrow">integrate · agent &amp; dev docs</div>
            <h2 className="of-h2">Your agent is the customer.</h2>
            <p className="of-lead">
              No agent opens a webpage. It integrates one of three ways — a paid API call, an MCP
              tool, or a LangGraph node — all built and working. It pays per answer with x402 on
              Base: $0.02 a derivation, $0.00 for anything reused. Pick a surface.
            </p>
          </div>

          {/* PATH 1 — Paid API call */}
          <div className="of-doc-path">
            <div className="of-doc-head">
              <span className="of-doc-idx">1</span>
              <h3>Paid API call</h3>
              <span className="of-doc-tag">x402 · Base</span>
            </div>
            <pre className="of-code">
              <span className="kw">client</span> = x402Client()               <span className="cm"># pays per call, on Base</span>{"\n"}
              r = <span className="kw">await</span> http.post(<span className="st">".../answer"</span>)   <span className="cm"># x402 settles the quote</span>{"\n"}
              dossier = r.json()[<span className="st">"dossier"</span>]       <span className="cm"># -&gt; the verdict, as JSON</span>
            </pre>
            <div className="of-doc-pricing" style={{ marginBottom: 16 }}>
              <span className="of-ptag">
                <b>$0.02</b> per derivation
              </span>
              <span className="of-ptag">
                <b>$0.00</b> reused
              </span>
              <span className="of-ptag">gasless USDC · EIP-3009</span>
            </div>
            <p className="hint" style={{ marginBottom: 10 }}>
              Run the exact call an agent makes — a real <code className="mono">POST /answer</code>, live
              against the running engine. You see the JSON the agent gets back.
            </p>
            <LiveCall />
          </div>

          {/* PATH 2 — MCP tool */}
          <div className="of-doc-path">
            <div className="of-doc-head">
              <span className="of-doc-idx">2</span>
              <h3>MCP tool — drop-in for Claude</h3>
              <span className="of-doc-tag">FastMCP &quot;rederive&quot;</span>
            </div>
            <pre className="of-code">
              <span className="cm"># FastMCP server "rederive"</span>{"\n"}
              <span className="kw">@mcp.tool()</span>{"\n"}
              <span className="kw">def</span> get_derivation(node): ...   <span className="cm"># get_derivation("s_verdict")</span>{"\n"}
              <span className="kw">@mcp.tool()</span>{"\n"}
              <span className="kw">def</span> recall(q, limit): ...       <span className="cm"># keyword search the memory</span>
            </pre>
            <p className="muted" style={{ fontSize: 14, marginTop: 14 }}>
              Point any MCP client at the server; the agent&rsquo;s model calls these tools directly —
              no glue code.
            </p>
          </div>

          {/* PATH 3 — LangGraph node */}
          <div className="of-doc-path">
            <div className="of-doc-head">
              <span className="of-doc-idx">3</span>
              <h3>LangGraph node</h3>
              <span className="of-doc-tag">memory node</span>
            </div>
            <pre className="of-code">
              graph = build_langgraph(engine){"\n"}
              <span className="cm"># Rederive becomes the memory node inside the agent&apos;s own workflow</span>
            </pre>
          </div>
        </section>

        {/* PRICING */}
        <section className="of-section flush">
          <div className="of-section-head">
            <div className="eyebrow">pricing · x402 on Base</div>
            <h2 className="of-h2">Metered per answer. You pay for what re-melts.</h2>
            <p className="of-lead">
              Every answer settles gaslessly in USDC via x402 (EIP-3009). Reused derivations cost
              nothing — you only pay for the cone that actually re-derives.
            </p>
          </div>

          <div className="of-doc-pricing">
            <span className="of-ptag">
              metered · <b>per answer</b>
            </span>
            <span className="of-ptag">
              <b>$0.02</b> per derivation
            </span>
            <span className="of-ptag">
              reused derivations <b>$0.00</b>
            </span>
          </div>

          <table className="of-price-table">
            <thead>
              <tr>
                <th>Call</th>
                <th>What runs</th>
                <th>You pay</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Cold full run</td>
                <td>24 derivations × $0.02</td>
                <td>
                  <b>$0.48</b>
                </td>
              </tr>
              <tr>
                <td>Warm re-answer (unchanged)</td>
                <td>24/24 reused · 0 recomputed</td>
                <td>
                  <b>$0.00</b>
                </td>
              </tr>
              <tr>
                <td>Per derivation</td>
                <td>one node re-derives</td>
                <td>
                  <b>$0.02</b>
                </td>
              </tr>
              <tr>
                <td>Reused derivation</td>
                <td>same hash · served from memory</td>
                <td>
                  <b>$0.00</b>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="of-proof-grid" style={{ marginTop: 26 }}>
            {TXS.map((tx) => (
              <a
                key={tx}
                className="of-proof-tx"
                href={`https://sepolia.basescan.org/tx/${tx}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="of-proof-dot" />
                <span className="of-proof-hash">{tx}…</span>
                <span className="of-proof-meta">USDC · EIP-3009</span>
              </a>
            ))}
          </div>
          <a
            className="of-proof-contract"
            href={`https://sepolia.basescan.org/address/${CONTRACT}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", marginTop: 18 }}
          >
            contract <span>{CONTRACT}</span> · sepolia.basescan.org
          </a>
          <p className="hint" style={{ marginTop: 14 }}>
            Four real gasless settlements on Base Sepolia — the price the engine quotes is the price
            actually paid.
          </p>
        </section>

        {/* CTA + FOOTER */}
        <section className="of-footer">
          <div className="of-footer-cta">
            <div className="eyebrow" style={{ justifyContent: "center" }}>
              watch cognition compile
            </div>
            <h2>Plug your agent in.</h2>
            <div className="of-cta center">
              <Link className="btn lg" href="/console">Open the console →</Link>
              <Link className="btn ghost" href="/token">Read the token thesis</Link>
            </div>
          </div>
          <div className="of-footer-links">
            <Link href="/console">Console</Link>
            <Link href="/token">Token</Link>
            <a href="https://rederive-api.onrender.com/health" target="_blank" rel="noopener noreferrer">API health</a>
            <a
              href={`https://sepolia.basescan.org/address/${CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              On-chain (Basescan)
            </a>
          </div>
        </section>
      </div>
    </>
  );
}
