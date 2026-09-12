# Livetest Report

**URL:** https://rederive.xyz (frontend) · https://rederive-api.onrender.com (API)
**Mode:** Web · **Version:** V1 (fresh run)
**Tested:** 2026-09-12 (post Obsidian Foundry redesign deploy)
**Overall:** PASS
**Results:** 17 PASS / 0 FAIL / 0 WARN  (1 WARN found + fixed mid-run: mobile nav overflow)

> Two P0/P1 issues were found and fixed live during this run (CORS + tier naming), then re-verified green. See Patch Run Summary.

---

## Domain Results

| # | Domain | Status | Notes |
|---|--------|--------|-------|
| 1 | Core user flows | PASS | ask-again ($0.00, 24 reused), edit→cone (6 redone / 18 reused), deletion test (24→0→restore) all live |
| 2 | API connectivity | PASS | /state /report /answer /edit /amnesia reachable after CORS fix; live dossier returned |
| 3 | Visual completeness | PASS | no undefined/null/NaN; real data (Uniswap · Promising · 78/100 · Medium) |
| 4 | Forms/interactions | PASS | console step buttons + integrate live-call all functional |
| 5 | Console errors | PASS | 0 first-party console errors (were CORS errors pre-fix) |
| 6 | Auth | N/A | public demo (DEMO_FREE=1, NEXT_PUBLIC_DEMO_ADMIN_TOKEN baked for judges) |
| 7 | Mobile | PASS | 375px no horizontal overflow (after nav fix) |
| 9 | Integration proof | PASS | live POST /answer → real dossier JSON {verdict:promising, score:72, risk:medium} |

## Key Test Results

| ID | Status | Detail |
|----|--------|--------|
| LAND-load | PASS | h1 renders |
| LAND-herostat | PASS | live "$0.00 to re-answer — 24/24 reused" |
| LAND-tiers | PASS | HOT/WARM/COLD/REFERENCE/ARCHIVE (matches backend + console panel; WRONG=[]) |
| LAND-onchain | PASS | 5 basescan links, 4/4 tx hashes visible |
| CON-livedata | PASS | Uniswap · Promising · 78/100 · Medium · 24/24 |
| CON-nav | PASS | 4-item tab nav |
| CON-fingerprint | PASS | 15 per-check #fingerprint hashes |
| CON-askagain | PASS | "0 answers redone. All 24 from memory. $0.00" |
| CON-cone | PASS | "Only 6 checks (token) redone. Other 18 reused free" |
| CON-deletion | PASS | "The whole report just vanished" · IN MEMORY 0/24 |
| CON-restore | PASS | "Restored, warm, in an instant" |
| INT-paths | PASS | 3 integration paths (API/MCP/LangGraph) |
| INT-livecall | PASS | live /answer → real dossier JSON |
| TOK-honest | PASS | honest "coming soon" placeholders, no fabricated tokenomics |
| CONSOLE-errors | PASS | 0 first-party errors |
| MOBILE-scroll | PASS | 375px, no overflow (post-fix) |

## Cold-Stranger Hero Gate

| Hero Action | Outcome | Notes |
|-------------|---------|-------|
| A cold judge (fresh browser, no creds) can edit a source and watch only its cone re-derive, then delete the memory and watch the dossier collapse & restore — live on rederive.xyz | **PASS** | Ran in a fresh Playwright context with no storageState; DEMO_FREE + public NEXT_PUBLIC_DEMO_ADMIN_TOKEN let a cold visitor drive edit/amnesia. Deletion test (the Sibyl gate) executed and reversed live. |

## Critical Issues (P0)
_None remaining._ (One found + fixed mid-run — see Patch Run.)

## Patch Run Summary

| Issue | Severity | Root cause | Fix | Re-verify |
|-------|----------|-----------|-----|-----------|
| Browser on rederive.xyz CORS-blocked from API | P0 | API `_default_origins` only allowed `rederive.vercel.app`; primary domain moved to rederive.xyz and the `sync:false` `CORS_ORIGIN` dashboard env was never updated | Added rederive.xyz + www to `api/rederive/server.py` defaults; committed (e8a2db8) + pushed → onrender auto-deploy (autoDeploy:yes) | PASS — preflight 200 + `access-control-allow-origin: https://rederive.xyz`; all live flows work |
| Landing "5 Sibyl tiers" named WORKING/EPISODIC/SEMANTIC/PROCEDURAL/COLD | P1 (factual, contradicts brief + own console) | redesign SPEC inherited tier names from the retired `_lab/report` cognitive reframing | Rewrote landing tiers to HOT/WARM/COLD/REFERENCE/ARCHIVE with real API mappings (matches `engine.py` + `FiveTier` panel); redeployed Vercel | PASS — WRONG=[] |
| Mobile nav horizontal overflow (~108px at 375px) | P2 | 4 tab pills + CTA didn't fit; nav not responsive | globals.css ≤640px: hide tab pills (footer carries nav), shrink CTA; redeployed | PASS — scrollW=375=clientW |

## Screenshots
screenshots/lt-landing.png · lt-console.png · lt-integrate.png · lt-token.png · lt-mobile.png · lt-mobile-fixed.png
