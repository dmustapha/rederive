# PULSE — Rederive rolling context

## [design + deploy + livetest] 2026-09-12

**What shipped this session:**
- Obsidian Foundry redesign (frontend-design → design → ui-revamp) ported into live Next.js app: Landing (Option-C single-scroll) + Console (reskin + fingerprint proof + 4-item nav) + NEW /integrate + NEW /token. /lab/* retired → app/_lab/.
- Deployed to production **rederive.xyz** via guarded `vercel --prod` (.env.local guard held every time; md5 fff4ce…).

**Livetest (V1, Web mode, live rederive.xyz): PASS — 17 PASS / 0 FAIL / 0 WARN.**
Two issues found + fixed live, one cosmetic:
- **P0 CORS** — API allowed only `rederive.vercel.app`, not the new canonical `rederive.xyz` → whole live-data layer was browser-blocked. Fixed in `api/rederive/server.py` `_default_origins` (commit e8a2db8, pushed → onrender auto-deploy). Re-verified: preflight 200 + ACAO header. **The `CORS_ORIGIN` dashboard env (sync:false) is still stale — code default now covers it, but set it to `https://rederive.xyz,https://www.rederive.xyz` for belt-and-suspenders.**
- **P1 tier naming** — landing "5 Sibyl tiers" showed WORKING/EPISODIC/SEMANTIC/PROCEDURAL/COLD (from retired _lab reframing), contradicting the brief AND the console's own FiveTier panel. Fixed → HOT/WARM/COLD/REFERENCE/ARCHIVE with real API mappings. Redeployed.
- **P2 mobile** — nav overflowed ~108px at 375px; globals.css ≤640px hides tab pills + shrinks CTA. Redeployed. No overflow.

**Cold-stranger hero gate: PASS** — fresh-context judge can drive edit→cone + deletion-test→restore live (DEMO_FREE + public NEXT_PUBLIC_DEMO_ADMIN_TOKEN).

**For Next Skill (demo_rehearsal / demo):**
- Live site fully functional on rederive.xyz; console walkthrough is the demo spine; deletion test (the Sibyl gate) works live.
- Uncommitted: the redesign (web/ + ai/ + design/ + _lab/ move) is LIVE on Vercel but NOT committed to git. Only the CORS fix was committed/pushed. Commit the redesign before relying on git/onrender parity.
- Optional: set the stale onrender `CORS_ORIGIN` env; commit the redesign; other 4 design mockups still carry the old tier names (review artifacts only).

## Downstream Items
| Item | Owner | Status |
|------|-------|--------|
| Commit the redesign (web/ai/design/_lab) to git — currently live-on-Vercel but uncommitted | next | open |
| Set onrender CORS_ORIGIN env to rederive.xyz,www (code default already covers it) | next | open |
