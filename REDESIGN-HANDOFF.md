# Rederive Frontend Redesign — Handoff (resume in new chat)

Working dir: `/Users/MAC/hackathon-toolkit/candidates/sibyl-memory-hack/rederive-app`
Repo: github.com/dmustapha/rederive · Live: rederive.xyz (Vercel, CLI-deploy only) · API: rederive-api.onrender.com

## Why we're here
The frontend NEVER went through the variation pipeline. `design_forge` ran at **Tier B** (`decisions.tier:"B"`, parityFloor absent) — it only recolored/crafted/formalized the build-phase UI and made a logo. No `/frontend-design` variations were ever generated or shown. design-forge is a POST-selection skill (formalize→refine→logo); it structurally cannot produce variations. It silently degraded to Tier B instead of blocking to say "run /design first."

## The plan (run in this order)
1. **`/frontend-design`** — generate **5 distinct** glossy-premium directions (mockups) for landing + console.
2. **`/design`** (orchestrator) — review variations, PICK, phase gates.
3. **`/ui-revamp`** — production polish to Linear/Vercel/glossy bar (Emil Kowalski / Rauno / Schoger / Soueidan principles).
4. **`/design-forge` Tier A** — re-formalize tokens + parity floor (logo already done — do NOT regenerate it).

## Direction (LOCKED by Dami this session)
- **Vibe:** Glossy premium, token-grade (cinematic dark, depth, gloss/glow, motion; "ape-worthy" for the token launch).
- **Palette:** Let EACH variation explore its own palette freely (not locked to amber). Current brand is amber #f5a623 on near-black #0e0e10 but variations may diverge.
- **Scope:** BOTH landing (`/`) and console (`/console`).
- **Count:** 5 distinct directions to review.
- **Architecture:** examine the WHOLE site IA (pages, sectioning, arrangement), not just visuals.

## Approved architecture — Option C (Hybrid) [Dami: "go with it"]
Site serves 3 audiences: hackathon judges (memory load-bearing proof), token buyers (thesis + premium feel + links), AI-agent customers (integration). Today's single landing only serves judges.

**Pages:**
- `/` — one cinematic single-scroll landing, anchor nav.
- `/console` — keep the interactive 5-step walkthrough, polish.
- `/integrate` — NEW: agent/dev docs (API + MCP + LangGraph + x402 pricing; "your agent is the customer").
- `/token` — NEW: token utility/why + buy/chart/social links. (OPEN: Dami to confirm tokenomics/contract/links exist yet, or make it a strong thesis/"coming soon" placeholder.)
- **Retire/hide `/lab`, `/lab/pipeline`, `/lab/report`** (appear to be dev/experimental — VERIFY before deleting).

**Landing sequence:** Hero (thesis + live warm-price stat + logo) → The problem (agents recompute everything) → How it works (reasoning as a build system) → Money shot: edit one source → cone re-derives, live → The deletion test (the gate moment, dramatized) → 5 Sibyl tiers + "your agent is the customer" → On-chain proof (4 Base Sepolia tx) → Token → CTA/footer.

## Must-keep (load-bearing for the Sibyl hackathon gate)
- The dependency-graph / **invalidation cone** money-shot (edit one source → only its cone re-derives).
- The **deletion test** as a hero moment (delete memory → dossier collapses → restore). This is the gate.
- 5 Sibyl tiers panel (all load-bearing), on-chain x402 proof (4 real Base Sepolia tx).

## Current state (already shipped this session)
- New amber **derivation-tree logo** (t23) live everywhere: favicon.ico, apple-touch, og.png, logo.png; mark next to REDERIVE in both navs. DO NOT regenerate the logo.
- Live URL switched to **rederive.xyz** (README + metadata). Pushed (commit bab2a5b, main). Deployed to Vercel prod (guarded, .env.local intact).
- Demo video final (all-Gemini-Puck, 2:07) at `video/out/demo.mp4`. Two X posts drafted (Alex/@soligxbt style).

## Tooling notes
- Image gen: fal key DEAD (401); Gemini image = free-tier limit 0 (billing-gated). **Pollinations.ai** (free, flux, no key) is what works: `https://image.pollinations.ai/prompt/{enc}?width=1024&height=1024&seed=N&nologo=true&model=flux` (watermark bottom-right → crop). agentcash stablestudio (GPT-Image-2 / Nano-Banana-Pro / vectorize) works but needs USDC (wallet currently $0).
- Image-view limit gets hit after many views in a long session — start fresh.
- Vercel = CLI deploy, guard `.env.local` (move aside + restore + md5 verify) around every `vercel --prod`.
- Commit hook blocks AI-referencing commit messages — write natural messages, no Co-Authored-By.

## First move in the new chat
Run `/frontend-design` for 5 glossy-premium directions across the Option-C architecture (landing + console + the two new pages), palettes free. Then `/design` to pick.

---

## PIPELINE GAP (separate meta-fix, not the Rederive redesign)
Confirmed against ~/.claude/skills/PIPELINE.md + hackathon-conductor/SKILL.md:
- The 18-phase pipeline's ONLY design phase is `design_forge` (post-selection formalize/craft/logo).
- `frontend-design`, `/design`, `ui-revamp` are NOT in the conductor sequence at all (grep = 0 hits). `/design` orchestrator exists only as a STANDALONE skill.
- So build codes a functional UI, design_forge polishes it — no generation/selection phase ever runs. Variations are structurally impossible in the pipeline. design_forge silently degrades to Tier B and reports "complete" instead of blocking.
- Ties to backlog: feedback_frontend_built_basic ("build feature-complete + polished from pass one") and the design_stack redesign (orchestrator rebuilt standalone, never wired into the pipeline).

**Fix options:**
1. Insert generation phase before design_forge: build(functional) → frontend-design → design(pick) → ui-revamp → design_forge(formalize). Add DESIGN_BRIEF collection (already exists) to feed frontend-design.
2. Make design_forge detect "no upstream design generation" and either dispatch the trio or hard-BLOCK with "run /design first" — never silently Tier-B-and-complete.

Recommendation: option 1 (wire the trio in) + option 2 as a guardrail.
