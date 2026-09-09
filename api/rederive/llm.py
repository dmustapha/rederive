# File: api/rederive/llm.py
"""Premium-first LLM ladder over Agent Router (Anthropic wire format) with local ollama tail.
Structured output: schema-validated canonical JSON; retry on malformed (max 2)."""
from __future__ import annotations
import json, os, httpx

AGENTROUTER = os.environ.get("AGENTROUTER_BASE_URL", "https://agentrouter.org/v1")
KEY = os.environ["AGENTROUTER_API_KEY"]
UA = "claude-cli/2.0.14 (external, cli)"          # REQUIRED — their gate rejects other clients
LADDER = ["claude-opus-4-8", "claude-opus-5", "gpt-5.6-sol", "deepseek-v4-flash", "glm-5.3"]
OLLAMA = os.environ.get("OLLAMA_URL", "http://localhost:11434")
_session_model: str | None = None

class LadderExhausted(RuntimeError): ...

def _agentrouter(model: str, system: str, user: str) -> str:
    r = httpx.post(f"{AGENTROUTER}/messages", timeout=90,
                   headers={"x-api-key": KEY, "anthropic-version": "2023-06-01",
                            "user-agent": UA, "content-type": "application/json"},
                   json={"model": model, "max_tokens": 900, "temperature": 0,
                         "system": system, "messages": [{"role": "user", "content": user}]})
    data = r.json()
    if "error" in data:
        raise RuntimeError(data["error"].get("message", "agentrouter error"))
    return "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()

def _ollama(system: str, user: str) -> str:
    r = httpx.post(f"{OLLAMA}/api/chat", timeout=180,
                   json={"model": "llama3.2:3b", "stream": False, "format": "json",
                         "options": {"temperature": 0, "seed": 7},
                         "messages": [{"role": "system", "content": system},
                                      {"role": "user", "content": user}]})
    return r.json()["message"]["content"].strip()

def _providers():
    for m in LADDER:
        yield m, lambda s, u, m=m: _agentrouter(m, s, u)
    yield "ollama/llama3.2:3b", _ollama

def _strip_fences(txt: str) -> str:
    if txt.startswith("```"):
        txt = txt.strip("`")
        if txt.startswith("json"): txt = txt[4:]
    return txt.strip()

def complete_json(system: str, user: str, required_keys: list[str]) -> dict:
    """Walk the ladder premium-first; per rung, 2 schema-validated attempts."""
    global _session_model
    order = list(_providers())
    if _session_model:                                    # sticky: probe once per session
        order.sort(key=lambda t: 0 if t[0] == _session_model else 1)
    last_err = None
    for name, call in order:
        for _attempt in range(2):
            try:
                raw = _strip_fences(call(system, user))
                obj = json.loads(raw)
                if not all(k in obj for k in required_keys):
                    raise ValueError(f"missing keys: {required_keys}")
                _session_model = name
                return obj
            except Exception as exc:                      # noqa: BLE001 — rung failure -> next
                last_err = f"{name}: {exc}"
                continue
        continue
    raise LadderExhausted(str(last_err))

STRUCT_RULES = ("Output ONLY a JSON object, no prose, no markdown fences. Keys sorted. "
                "Values MUST be numbers, booleans, enums from the given set, or strings <= 12 words. "
                "Never include reasoning or commentary fields.")
