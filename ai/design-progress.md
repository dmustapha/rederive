# Design Progress: Rederive redesign

Started: 2026-09-12
Style Config: ~/.claude/skills/design-taste/style.config.md (canonical)
Color Mode: dark-only — cinematic token-grade product; dark IS the identity
Flags: (frontend-design already run outside orchestrator → Phases 1-3 short-circuited)

## Phase 1: State Design
Status: skipped — live API already defined (api.ts: /report /state /answer /edit /amnesia /verify); hooks useRederive + useReport wired

## Phase 2: Creative (5 Proposals)
Status: completed
Proposals: design/variations/direction-1..5 (Obsidian Foundry / Prism Terminal / Editorial Vault / Neon Depth / Blueprint Mono)

## Phase 3: Selection
Status: completed
Selected: Direction 01 — Obsidian Foundry (design/variations/direction-1-obsidian-foundry.html)
  Molten copper→amber→gold on obsidian · Clash Display + Satoshi + JetBrains Mono · white-hot invalidation cone · heat-glow + grain

## Phase 4: Production Polish (ui-revamp — port mockup into live Next.js app)
Status: completed
Scope: globals.css + layout fonts (foundation) → Landing (Option-C single-scroll) + Console reskin + NEW /integrate + NEW /token
Constraint: preserve ALL live wiring (useRederive/useReport, Graph, deletion test → /amnesia). No mock data.
Retire: /lab/* AFTER port verified (mine /lab/report fingerprint proof into console first)

## Phase 5: Final QA
Status: pending

## Phase 4 — DONE (2026-09-12)
- Foundation: globals.css → Obsidian Foundry (~740 lines), layout.tsx fonts (Clash Display + Satoshi + JetBrains Mono), design/CLASS-CONTRACT.md
- Landing: app/page.tsx rewritten to Option-C single-scroll (hero→problem→how→cone→deletion-test→5 tiers+customer→on-chain proof→token→CTA); useRederive + live Graph kept wired
- Console: reskinned via globals.css class contract (no TSX rewrite); live hooks intact
- NEW /integrate: 3 paths (API+MCP+LangGraph) + live /answer call button + x402 pricing table + 4 tx
- NEW /token: honest thesis + coming-soon chart + social pills (Buy/X disabled) + honest footnote
- /lab/* retired → app/_lab/ (routes gone, source kept to mine fingerprint proof)
- VERIFIED: npx tsc --noEmit = 0 errors; npm run build = success (4 routes); all 4 routes HTTP 200; screenshots captured
- Fixed: integrate footer API link localhost → rederive-api.onrender.com/health; layout metadata typed as Metadata

## Phase 5: Final QA
Status: completed (2026-09-12)
- (a) Console nav → unified 4-item tab nav (Home/Console·active/Integrate/Token) ✓
- (b) Mined _lab/report per-card fingerprint proof into console: #hash under each check + reused·same-hash / re-derived·new-hash tags ✓
- (c) Live-data pass ✓ — dev run against deployed API (rederive-api.onrender.com, inline override, .env.local untouched): console shows real Uniswap data (Verdict Promising / Score 78 / Risk Medium / 24-24 memory / live #fingerprints); landing hero $0.00 warm + live Graph render
- Gates: tsc 0 errors · npm run build success (4 routes) · screenshots captured (static + live)
QA Result: APPROVED — ready to ship. Deploy note: set NEXT_PUBLIC_API_URL=https://rederive-api.onrender.com in the Vercel env (do NOT bake localhost); guard .env.local around any vercel --prod.
