# SECURITY — Rederive
- No private keys on any host. Seller address is public; BUYER_PRIVATE_KEY lives only in the local buyer script env.
- Admin mutations (/edit /reset /amnesia /seed_sources) require X-Admin-Token.
- LLM outputs are schema-validated; malformed responses are rejected and retried, never stored.
- Memory writes flow through engine.py only; the journal is append-only; superseded derivations are archived, not deleted.
- Known limitation: 402 price fixed at challenge time (see README).
