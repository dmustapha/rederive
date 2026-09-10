#!/usr/bin/env python3
"""Generate the baked warm-seed db from the canonical Uniswap source fixtures.

Runs the REAL pipeline (live LLM) once, producing the 24-node warm dossier, and writes it to
api/seed/memory.warm.db. The deploy image bakes this in; the boot entrypoint re-hydrates it when
the runtime db is absent (free-tier spin-down), so every cold boot comes up warm. The derivations
are REAL (computed by the live pipeline) — the fixture only supplies the raw INPUT sources.

Usage:  set -a; source ../.env; set +a; PYTHONPATH=. python scripts/gen_seed.py
"""
from __future__ import annotations
import json, os, sys, pathlib

HERE = pathlib.Path(__file__).resolve().parent
API = HERE.parent
SEED_DIR = API / "seed"
SEED_DB = SEED_DIR / "memory.warm.db"
FIXTURES = SEED_DIR / "sources.uniswap.json"

# Build the seed at a scratch path, then copy to SEED_DB only on a clean full run.
SCRATCH = "/tmp/rederive-seedgen.db"
os.environ["REDERIVE_DB"] = SCRATCH
for p in (SCRATCH, SCRATCH + ".amnesia"):
    if os.path.exists(p):
        os.remove(p)

from rederive.engine import Engine
from rederive.pipeline import dossier_graph, SOURCES

def main() -> int:
    fixtures = json.loads(FIXTURES.read_text())
    sources = {k: v for k, v in fixtures.items() if k in SOURCES}
    missing = [s for s in SOURCES if s not in sources]
    if missing:
        print(f"FATAL: fixture missing sources {missing}", file=sys.stderr)
        return 2

    eng = Engine(db_path=SCRATCH, tenant="rederive")
    eng.seed_doctrine()
    for name, content in sources.items():
        eng.ingest_source(name, content)
    print(f"ingested {len(sources)} sources; running the real pipeline (live LLM)…")

    graph = dossier_graph()
    rep = eng.run_graph(graph)
    derived, errors = len(rep.derived), rep.errors
    print(f"run complete: {derived} derived, {len(errors)} errors")
    if errors:
        for node, err in errors.items():
            print(f"  ERROR {node}: {err}", file=sys.stderr)
        print("FATAL: pipeline produced errors — not writing seed", file=sys.stderr)
        eng.close()
        return 1

    # sanity: a warm dossier is 24 derivations + 6 sources; verify the headline synth nodes exist
    for headline in ("s_risk", "s_score", "s_verdict"):
        val = eng.get_derivation(headline)["value"]
        print(f"  {headline}: {val}")
    q = eng.quote(graph)
    if q["derived_count"] != 0:
        print(f"FATAL: warm quote should be 0 derived, got {q['derived_count']}", file=sys.stderr)
        eng.close()
        return 1
    eng.close()

    SEED_DIR.mkdir(exist_ok=True)
    import shutil
    shutil.copy(SCRATCH, SEED_DB)
    size = SEED_DB.stat().st_size
    print(f"\nOK — warm seed written: {SEED_DB} ({size} bytes), warm quote 0-derived confirmed.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
