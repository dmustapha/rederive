# File: api/scripts/llm_ladder_probe.py
"""Prints which ladder rung answers right now (premium pools may refill — Dami directive)."""
from rederive.llm import _providers
for name, call in _providers():
    try:
        out = call("Reply with exactly: OK", "Reply with exactly: OK")
        print(f"LIVE  {name}: {out[:20]!r}"); break
    except Exception as e:
        print(f"dead  {name}: {str(e)[:70]}")
