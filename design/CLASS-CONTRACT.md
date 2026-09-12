# CLASS-CONTRACT — Obsidian Foundry

Wave 2 agents building the redesigned **Landing / Integrate / Token** pages MUST emit TSX
using EXACTLY the class names below. They are all defined in `web/app/globals.css`.
Do not invent new class names; do not rename these. Dark-only, molten accent, WCAG-AA.

Naming prefixes:
- `of-` — Obsidian Foundry shared layout (wrap/section/hero/cards/cta/footer)
- `of-cone-` — money-shot invalidation cone
- `of-del-` — deletion-test block
- `of-tier-` / `of-tiers` — five-tier grid
- `of-proof-` — on-chain proof cards
- `of-doc-` — /integrate docs
- `of-tok-` — token page

---

## Shared layout

| Class | Purpose | Key modifiers |
|---|---|---|
| `of-wrap` | Centered max-width (1160px) content wrapper, sits above grain/heat ambience. | — |
| `of-section` | One vertical section band with bottom hairline. | `.flush` (no bottom border), `.band` (surface bg) |
| `of-section-head` | Header block above a section's body (eyebrow + h2 + lead). | `.center` (centers text + h2 + lead) |
| `of-h2` | Section display heading (Clash Display, fluid 30→52px). | — |
| `of-lead` | Muted intro paragraph under a heading. | — |
| `of-cta` | Button row (wraps). | `.center` (centers buttons) |
| `of-grid` | Card grid. | `.g3` (3-col), `.g2` (2-col) — both collapse to 1-col ≤900px |
| `of-card` | Generic content card (hover lift). | — |
| `of-card h3` / `of-card p` | Card title / body — style automatically. | — |
| `of-card-badge` | Small mono kicker inside a card (e.g. `01 — no memory`). | — |
| `of-rise` | Stagger-in on mount (opacity+transform, reduced-motion safe). | pair with `of-d1`…`of-d6` delay classes |

## Hero (landing)

| Class | Purpose | Modifiers |
|---|---|---|
| `of-hero` | Hero section wrapper. | — |
| `of-hero-h` | Hero display headline (fluid 46→92px). | — |
| `of-molten` | Wrap a `<span>` of headline text for the copper→amber→gold gradient fill. | inline; reuse anywhere for molten text |
| `of-hero-sub` | Sub-headline paragraph. | — |
| `of-hero-note` | Mono heritage/comment line (e.g. `// Watch cognition compile.`). | — |
| `of-hero-stat` | The `$0.00` vs cold-run readout card. | contains `of-stat-big`, `of-stat-lbl`, `of-stat-sep`, `of-stat-cold` (use `<s>` inside for strikethrough cold price) |

## How-it-works / problem cards
Use `of-grid g3` + `of-card` + `of-card-badge`. No dedicated classes needed.

## Money shot — invalidation cone

| Class | Purpose |
|---|---|
| `of-cone` | 2-col grid: stage (left) + math (right); collapses ≤900px. |
| `of-cone-stage` | The SVG stage panel (deep shadow). |
| `of-cone-ctrl` | Button row under the stage. |
| `of-cone-edge` | SVG `<path>` edge. Add `.hot` for the white-hot re-derive branch. Requires SVG `<defs>` with `id="hotEdge"`, filters `id="glow"` / `id="glowStrong"` (copy from mockup). |
| `of-cone-node` | SVG `<circle>` node. States: `.cold` (obsidian), `.hot` (glowing pulse), `.src-hot` (edited source). |
| `of-cone-label` | SVG `<text>` node label. Add `.hot` for gold. |
| `of-cone-math` | Right column stack of cost rows. |
| `of-cone-row` | One cost row. Modifiers: `.cold` (faint $0.48), `.warm` (molten gradient $0.14), `.free` (green $0.00). Inner: `.k` label, `.v` big number, `.sub` mono footnote. |

## Deletion test

| Class | Purpose |
|---|---|
| `of-del` | The block panel. |
| `of-del-bar` | Top row (label + record count). Wrap the count in `<b>` for molten color. |
| `of-del-dots` | 12-col grid of record dots. |
| `of-del-dot` | One dot. States: `.on` (molten fill), `.gone` (wiped). |
| `of-del-db` | DB-size line. Inner spans: `.from`, `.to` (add `.restored` for green). |
| Buttons | Use `btn` (restore/warm) and `btn danger` (delete). |

## Five-tier grid (landing)

| Class | Purpose |
|---|---|
| `of-tiers` | 5-col grid (→2-col ≤900px). |
| `of-tier` | One tier card (top molten hairline via `::before`). |
| `of-tier-name` | Tier name (Clash Display). |
| `of-tier-desc` | Tier description. |
| `of-customer` | Customer callout band under the tiers (warm gradient). Inner: `of-customer-txt`, then `h3` + `p`. |

## On-chain proof

| Class | Purpose |
|---|---|
| `of-proof-grid` | 2-col grid of tx rows (→1-col ≤900px). |
| `of-proof-tx` | One tx row — render as `<a>` to Basescan. |
| `of-proof-dot` | Green status dot. |
| `of-proof-hash` | The mono hash. |
| `of-proof-meta` | Right-aligned mono meta (e.g. `USDC · EIP-3009`). |
| `of-proof-contract` | Contract-address line. Wrap the address in `<span>` for molten color. |

## Integrate (/integrate docs)

| Class | Purpose |
|---|---|
| `of-doc-path` | One integration-path card. |
| `of-doc-head` | Path header row. Inner: `of-doc-idx` (numbered badge), `h3`, `of-doc-tag` (right pill). |
| Code blocks | Reuse **`av-code`** (from console) OR a plain `<pre>` inside `of-doc-path`, OR `pre.of-code`. Syntax spans: `.cm` (comment/faint), `.kw` (keyword/molten), `.st` (string/green). |
| `of-doc-pricing` | Row of pricing tags. |
| `of-ptag` | One pricing tag. Wrap emphasized value in `<b>` (molten). |
| `of-price-table` | Pricing `<table>`. `th`/`td` auto-styled; `td b` renders mono molten. |

## Token (/token)

| Class | Purpose |
|---|---|
| `of-tok-hero` | Centered token hero. Use `of-molten` span inside `h1`. |
| `of-tok-chart` | Coming-soon chart panel. Inner: `of-tok-soon` (kicker), then the SVG. |
| `of-tok-thesis` | 3-col grid of thesis cards — use `of-card` + `of-card-badge` inside (→1-col ≤900px). |
| `of-tok-social` | Row of social/link pills (`<a>`). Add `.disabled` for "Buy · coming soon". |
| `of-honest` | Honest-placeholder footnote line. |

## CTA + Footer

| Class | Purpose |
|---|---|
| `of-footer` | Footer section (no bottom border). |
| `of-footer-cta` | Centered closing CTA block (`h2` + `of-cta center`). |
| `of-footer-links` | Row of mono footer links. |

---

## REUSE these existing util / tone classes (do NOT redefine)

- **Buttons:** `btn` (molten primary — this is the DEFAULT/primary, not ghost), `btn ghost`, `btn danger`, `btn lg`, `btn sm`. On the molten `.btn`, text is dark ink automatically.
- **Eyebrow kicker:** `eyebrow` (mono, molten, with leading rule). Add `.center` to center it.
- **Mono hashes / ids / node-ids:** `mono-hash` (block, molten-3, word-break). Any raw hash/address/tx must use mono.
- **Verdict tones (heat colors):** `t-good` (green), `t-mid` (amber), `t-bad` (red). Work as pill backgrounds on spans, or as text-only color on `<b>` (`b.t-good` etc.).
- **Hints / muted:** `hint`, `muted`.
- **Nav (4-item):** `nav` shell; brand = `nav-brand` with `<b>RE</b>DERIVE` (the `RE` renders molten-gradient) + `nav-logo` img (or `nav-mark`/`tree-mark` svg); links group `nav-right` → optionally `nav-tabs` pill group with `nav-link` (add `.active` on current page — active gets the molten pill).
- **Molten text anywhere:** wrap in `<span class="of-molten">`.

## Fonts (already wired in layout.tsx)
`--font-display` = Clash Display · `--font-sans` = Satoshi · `--font-mono` = JetBrains Mono.
All headings default to Clash Display; body to Satoshi; put every number/hash/id/code in mono (JetBrains) via `mono`, `mono-hash`, `av-code`, or a `<pre>`.
