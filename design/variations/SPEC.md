# Rederive — Redesign Mockup SPEC (shared content for all 5 directions)

You are building ONE self-contained HTML mockup for a glossy-premium redesign of **Rederive**.
All 5 directions share this exact CONTENT and STRUCTURE. Only the AESTHETIC differs (given separately per direction).
This is a REVIEW mockup: static, no build step, opens directly in a browser. Use real data below — invent nothing.

---

## What Rederive is (say it in 5 seconds)
An AI that researches a crypto project once, remembers the answer in **Sibyl Memory**, and only re-checks what changes.
A due-diligence dossier is a **dependency graph**: 6 sources feed 24 derivations. Edit one source and only the part that
depends on it re-derives; everything else is served straight from memory, for free. **A build system for an agent's reasoning.**
Heritage line: *"incremental compilation for cognition" / "Watch cognition compile."*

**The real customer is an AI agent**, not a human. A human reads the site to watch it work; an agent calls the metered API and pays per answer with **x402 on Base**.

Three audiences the site must serve (this is the approved "Option C" architecture):
1. Hackathon judges — memory is load-bearing, proven live.
2. Token buyers — the thesis + a premium, "ape-worthy" feel + links.
3. AI-agent customers — how to integrate.

## The graph (the core mechanic)
6 sources → 6 extractions → 15 metrics → 3 conclusions = **24 derivations**, each content-addressed by a hash of its inputs.
Same input hash = reused (free). New hash = recomputed. A mismatch auto-invalidates the downstream "cone" (verify-on-serve).

Demo project analyzed: **Uniswap**.

The 15 checks, grouped (use these exact groups + labels):
- **Docs & API**: Doc quality, Storage architecture, API surface
- **Code & team**: Commit rate, Test coverage, Bus factor, Team track record
- **Token**: Supply risk, Utility, Liquidity
- **Community**: Transparency, Sentiment, Growth
- **Security**: Audit status, Security incidents

Verdict verbs: Good / Fair / Weak (green / amber / red).

## The money-shot numbers (use exactly)
- Cold run (compute everything): **$0.48** = 24 derivations × $0.02
- Re-answer an unchanged dossier (warm): **$0.00**, 24/24 reused, 0 recomputed
- Edit the **token** source and rebuild: only its cone (~7 conclusions) recompute (~**$0.14**); the other 17 are reused, free
- Deletion test: delete memory → 24 records → **0**, db collapses **471 KB → 4 KB**, the dossier vanishes; restore = warm instantly

## The 5 Sibyl memory tiers (ALL load-bearing, none decorative)
- **WORKING** — holds the live run cursor
- **EPISODIC** — stores the 24 derivations that reuse hits
- **SEMANTIC** — the extracted facts
- **PROCEDURAL / REFERENCE** — the pricing + invalidation doctrine the engine consults
- **COLD** — the raw sources + FTS5 keyword recall
Plus: content-addressed records, a multi-tenant commons, MCP + LangGraph surfaces.

## On-chain proof (real, Base Sepolia)
Real gasless USDC settlements via **x402 (EIP-3009)**. The price the product computes is the price actually paid. 4 real transactions:
`0x10759f3c…` · `0x11ae4043…` · `0x5ed48622…` · `0x92606759…`
Contract: `0xc211C942946011859ca634F22400d80570ED12A5` on `sepolia.basescan.org`.

## The 3 ways an agent plugs in (for /integrate)
1. **Paid API call · x402 on Base** —
```
client = x402Client()               # pays per call, on Base
r = await http.post(".../answer")   # x402 settles the quote
dossier = r.json()["dossier"]       # -> the verdict, as JSON
```
2. **MCP tool · drop-in for Claude** — FastMCP server "rederive":
```
@mcp.tool()
def get_derivation(node): ...   # get_derivation("s_verdict")
@mcp.tool()
def recall(q, limit): ...       # keyword search the memory
```
Point any MCP client at the server; the agent's model calls these tools directly, no glue code.
3. **LangGraph node** —
```
graph = build_langgraph(engine)
# Rederive becomes the memory node inside the agent's own workflow
```
x402 pricing: metered per answer, $0.02 per derivation, reused derivations are $0.00.

## The console walkthrough (5 steps — for /console)
1. **What the AI built** — read 6 Uniswap sources (docs, code, token, team, community, audits) → 15 checks + 1 verdict.
2. **Asking again is free** — it already did the work and remembers it; ask again → 0 recomputed, $0.00.
3. **Change one thing, redo only that** — edit the token source & rebuild → only the token checks light up; you pay ~$0.14, not $0.48.
4. **The answers live in memory** — delete the memory → the whole report vanishes → restore, warm. This is THE gate moment; dramatize it.
5. **How it remembers, and who actually uses it** — the customer is an AI agent (3 integration paths), paying per answer with x402 on Base; under the hood, 5 memory layers do the remembering.
The console shows a status bar (Project: Uniswap · Verdict · Score /100 · Risk · In memory: 24/24) and a live grid of the 15 checks that reacts each step.

---

## PAGES to build (all four, in ONE html file, switchable via a sticky top tab-nav: Landing · Console · Integrate · Token)

### `/` Landing — one cinematic single-scroll, anchor nav. Section order (KEEP this sequence):
1. **Hero** — thesis + a live "warm price" stat ($0.00 to re-answer) + the logo/wordmark.
2. **The problem** — agents recompute everything, every time; there's no build cache for reasoning.
3. **How it works** — reasoning treated like a build system (the 3 points: a dossier is a DAG · only the cone re-derives · built for machines).
4. **Money shot** — edit one source → the cone re-derives, live (show the graph/cone visual + the $0.48 → $0.14 math).
5. **The deletion test** — the gate moment, dramatized (delete memory → dossier collapses → restore).
6. **5 Sibyl tiers + "your agent is the customer"** — the 5 tiers, all load-bearing.
7. **On-chain proof** — the 4 Base Sepolia tx, verifiable.
8. **Token** — utility/why + a "coming soon" chart/buy nod + social links.
9. **CTA / footer**.

### `/console` — the 5-step guided walkthrough (static representation): the status bar + the 15-check grid + the current step's narration & action button. Show at least step 3 (the cone) and reference the deletion test.

### `/integrate` — agent/dev docs: the 3 integration paths (API + MCP + LangGraph) with the code blocks above, x402 pricing, "your agent is the customer" framing.

### `/token` — token utility/why + buy/chart/social links. Tokenomics/contract may not exist yet — treat buy/chart as a tasteful **"coming soon"** while making a strong thesis: Rederive meters memory per answer (x402), agents are the buyers → the token captures the metered-memory economy. Social links: rederive.xyz, the API, on-chain (Basescan), X/Twitter (placeholder ok). Be honest, not fake.

---

## Wordmark & logo
Wordmark: **RE**DERIVE (the "RE" is the accent color). There is an existing amber derivation-tree logo at `/logo.png` — you MAY reference a small SVG stand-in tree mark, but the wordmark treatment is what matters in the mockup. Do not fake a photographic logo.

## Output contract (STRICT)
- Write exactly ONE file to the path given in your direction brief. Self-contained: inline `<style>` + inline `<script>`. Fonts via `<link>` to Google Fonts / Fontshare CDN (allowed). No local build, no npm, no external images except the tiny inline SVG marks you draw yourself.
- Must open correctly by double-clicking the file (file://). All 4 pages reachable via the sticky tab-nav; default view = Landing.
- Include the money-shots: the invalidation cone (edit → only cone re-derives), the deletion test (collapse → restore), the 5 tiers, the 4 on-chain tx. These are load-bearing — do not omit any.
- Real content only (numbers, tx hashes, tiers, integration code above). No lorem ipsum.
- Glossy premium / token-grade: cinematic depth, gloss/glow, tasteful motion (CSS load-in stagger, hover, one hero animation). Match motion density to the aesthetic.
- Accessibility: readable contrast, semantic headings, focus states.
- Aim ~700–1100 lines. Ship a complete, polished, memorable page — not a skeleton.
