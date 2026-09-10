// File: web/app/page.tsx — LANDING. Explain the product in 5 seconds; the graph is a showcase.
"use client";
import Link from "next/link";
import Graph from "../components/Graph";
import { useRederive } from "../lib/useRederive";

const COLD = 24 * 0.02;

export default function Landing() {
  const { state, verify } = useRederive();
  const q = state?.quote;
  const price = q ? q.total_usd : null;
  const reused = q?.reused_count ?? 0;
  const saved = q && COLD > 0 ? Math.round((1 - q.total_usd / COLD) * 100) : 0;

  return (
    <>
      <nav className="nav">
        <span className="nav-brand"><b>RE</b>DERIVE</span>
        <span className="nav-right">
          <a className="nav-link" href="#how">How it works</a>
          <a className="nav-link" href="#proof">Proof</a>
          <Link className="btn" href="/console">Open the console →</Link>
        </span>
      </nav>

      <div className="landing">
        {/* HERO */}
        <section className="hero">
          <div className="eyebrow">incremental compilation for cognition</div>
          <h1 className="hero-h">Watch cognition <em>compile</em>.</h1>
          <p className="hero-p">
            A due-diligence dossier is a dependency graph — six sources feed twenty-four derivations.
            Edit one source and only the part that depends on it re-derives; everything else is served
            straight from memory, for free. A build system for an agent&rsquo;s reasoning, on Sibyl Memory.
          </p>
          <div className="hero-cta">
            <Link className="btn lg" href="/console">Open the console →</Link>
            <a className="nav-link" href="#how">See how it works ↓</a>
          </div>
          <div className="hero-metrics">
            <div className="metric">
              <div className="m-num amber">{price == null ? "—" : `$${price.toFixed(3)}`}</div>
              <div className="m-lab">cost to re-answer (warm)</div>
            </div>
            <div className="metric">
              <div className="m-num">{reused}/24</div>
              <div className="m-lab">derivations reused, not recomputed</div>
            </div>
            <div className="metric">
              <div className="m-num">{saved > 0 ? `${saved}%` : "—"}</div>
              <div className="m-lab">compute saved vs a cold run</div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS — three plain-language points */}
        <section className="sec" id="how">
          <div className="eyebrow">how it works</div>
          <h2 className="sec-h">Reasoning, treated like a build.</h2>
          <p className="sec-lead">
            Every conclusion is content-addressed by its inputs. Change an input and only its
            downstream &ldquo;cone&rdquo; is rebuilt — the same idea that makes code compilers fast,
            applied to an agent&rsquo;s thinking.
          </p>
          <div className="points">
            <div className="point">
              <div className="p-k">the graph</div>
              <div className="p-h">A dossier is a DAG</div>
              <div className="p-p">6 sources → 6 extractions → 15 metrics → 3 conclusions. Twenty-four
                derivations, each addressed by a hash of its inputs.</div>
            </div>
            <div className="point">
              <div className="p-k">the reuse</div>
              <div className="p-h">Only the cone re-derives</div>
              <div className="p-p">Edit the token source and just its 7 dependents recompute. The
                other 17 are served from memory at zero cost — priced honestly, per run.</div>
            </div>
            <div className="point">
              <div className="p-k">the consumer</div>
              <div className="p-h">Built for machines</div>
              <div className="p-p">Another agent calls the metered endpoint or reads the memory over
                MCP / LangGraph. This console is the human operator&rsquo;s window into it.</div>
            </div>
          </div>
        </section>

        {/* SHOWCASE — the live graph, read-only */}
        <section className="sec">
          <div className="eyebrow">the live graph</div>
          <h2 className="sec-h">The dependency graph, live.</h2>
          <p className="sec-lead">This is the real deployed dossier — warm in memory right now.
            Open the console to edit a source and watch a cone light up.</p>
          <div className="showcase">
            <div className="showcase-bar">
              <span className="showcase-t">sources → extractions → metrics → synthesis</span>
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

        {/* PROOF */}
        <section className="sec" id="proof">
          <div className="eyebrow">proof, not claims</div>
          <h2 className="sec-h">Every claim is verifiable.</h2>
          <div className="proof-grid">
            <div className="proof-card">
              <h4>Memory is load-bearing</h4>
              <p>Rename the memory out and the intelligence vanishes — only raw sources remain. The
                deletion test runs live on the console (amnesia → restore).</p>
            </div>
            <div className="proof-card">
              <h4>Settled on-chain</h4>
              <p>Real gasless USDC settlements on Base Sepolia (x402, EIP-3009), each resolvable on
                Basescan. The price the product computes is the price actually paid.</p>
              <span className="mono-hash">0x10759f3c… · 0x11ae4043… · 0x5ed48622… · 0x92606759…</span>
            </div>
            <div className="proof-card">
              <h4>Deepest Sibyl integration</h4>
              <p>All five memory tiers are load-bearing — HOT, WARM, COLD, REFERENCE, ARCHIVE — plus
                FTS5 recall, a multi-tenant commons, MCP and LangGraph. None decorative.</p>
            </div>
          </div>
        </section>
      </div>

      <footer className="foot">
        <span>Rederive · Sibyl Labs Memory Hackathon</span>
        <span className="foot-links">
          <Link className="link" href="/console">Console</Link>
          <a className="link" href="https://rederive-api.onrender.com/health" target="_blank" rel="noreferrer">API</a>
          <a className="link" href="https://sepolia.basescan.org/address/0xc211C942946011859ca634F22400d80570ED12A5" target="_blank" rel="noreferrer">On-chain</a>
        </span>
      </footer>
    </>
  );
}
