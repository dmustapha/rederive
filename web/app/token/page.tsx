// File: web/app/token/page.tsx — TOKEN. Honest thesis: metered memory, agents as buyers.
// Buy & chart are tasteful "coming soon" placeholders — no fabricated price/contract/tokenomics.
// Server Component — no hooks, no interactivity.
import Link from "next/link";

const CONTRACT = "0xc211C942946011859ca634F22400d80570ED12A5";

export default function Token() {
  return (
    <>
      <nav className="nav">
        <span className="nav-brand"><img className="nav-logo" src="/logo.png" alt="Rederive" /><b>RE</b>DERIVE</span>
        <span className="nav-right">
          <span className="nav-tabs">
            <Link className="nav-link" href="/">Home</Link>
            <Link className="nav-link" href="/console">Console</Link>
            <Link className="nav-link" href="/integrate">Integrate</Link>
            <Link className="nav-link active" href="/token">Token</Link>
          </span>
          <Link className="btn" href="/console">Open the console →</Link>
        </span>
      </nav>

      <div className="of-wrap">
        <section className="of-section flush">
          {/* HERO — the thesis */}
          <div className="of-tok-hero">
            <div className="eyebrow center">Token thesis</div>
            <h1>The token that captures <span className="of-molten">metered memory.</span></h1>
            <p className="of-lead" style={{ margin: "20px auto 0" }}>
              Rederive meters memory per answer via x402 on Base. The customer is an AI agent, not a
              human — agents are the buyers. As more agents cache their reasoning in Sibyl Memory,
              the metered-memory economy compounds and accrues to the token.
            </p>
          </div>

          {/* COMING-SOON CHART — honest placeholder, not price data */}
          <div className="of-tok-chart">
            <div className="of-tok-soon">Chart · coming soon</div>
            <svg viewBox="0 0 640 200" aria-label="Placeholder chart — no live price data" role="img">
              <defs>
                <linearGradient id="chg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#f5a623" stopOpacity=".4" />
                  <stop offset="1" stopColor="#ff5e1a" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="chl" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ff5e1a" />
                  <stop offset="1" stopColor="#ffce54" />
                </linearGradient>
              </defs>
              <path
                d="M0,160 C120,150 180,120 260,110 C360,98 420,60 520,44 C580,34 620,26 640,20 L640,200 L0,200 Z"
                fill="url(#chg)"
              />
              <path
                d="M0,160 C120,150 180,120 260,110 C360,98 420,60 520,44 C580,34 620,26 640,20"
                fill="none"
                stroke="url(#chl)"
                strokeWidth="2.6"
              />
            </svg>
          </div>

          {/* THESIS — 3 cards, tied to real on-chain proof */}
          <div className="of-tok-thesis">
            <div className="of-card">
              <span className="of-card-badge">Why a token</span>
              <h3>Metered memory needs a rail</h3>
              <p>
                Every answer settles through x402 (EIP-3009) on Base — $0.02 per derivation, $0.00
                reused. The token routes and captures that metered flow: the more reasoning cached,
                the more value crosses the rail.
              </p>
            </div>
            <div className="of-card">
              <span className="of-card-badge">What it captures</span>
              <h3>Per-answer x402 · agent demand</h3>
              <p>
                Agents call the metered API and pay per answer. As they cache dossiers in a
                multi-tenant commons of content-addressed reasoning, shared cache means shared
                savings — and compounding demand for metered memory.
              </p>
            </div>
            <div className="of-card">
              <span className="of-card-badge">Where it stands</span>
              <h3>Honest current status</h3>
              <p>
                No token is live yet — no supply, no price, no tokenomics to fabricate. What is
                live: 4 real Base Sepolia settlements via x402, on contract{" "}
                <span className="of-molten mono">{CONTRACT.slice(0, 10)}…</span> — the metering rail
                the token would sit on.
              </p>
            </div>
          </div>

          {/* SOCIAL / LINKS */}
          <div className="of-tok-social">
            <a href="https://rederive.xyz" target="_blank" rel="noopener noreferrer">rederive.xyz</a>
            <a href="https://rederive-api.onrender.com/health" target="_blank" rel="noopener noreferrer">API</a>
            <a
              href={`https://sepolia.basescan.org/address/${CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              On-chain · Basescan
            </a>
            <a className="disabled" aria-disabled="true">X · soon</a>
            <a className="disabled" aria-disabled="true">Buy · coming soon</a>
          </div>

          {/* HONEST FOOTNOTE */}
          <p className="of-honest">
            Buy &amp; chart are not live yet — they are honest placeholders. The memory product and
            its per-answer x402 metering are real and running on Base Sepolia today.
          </p>
        </section>

        {/* CTA + FOOTER */}
        <section className="of-footer">
          <div className="of-footer-cta">
            <div className="eyebrow" style={{ justifyContent: "center" }}>Watch cognition compile</div>
            <h2 className="of-h2">The economy is metered memory.</h2>
            <div className="of-cta center">
              <Link className="btn lg" href="/console">Open the console</Link>
              <Link className="btn ghost" href="/integrate">Integrate your agent</Link>
            </div>
          </div>
          <div className="of-footer-links">
            <Link href="/">Home</Link>
            <Link href="/console">Console</Link>
            <Link href="/integrate">Integrate</Link>
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
