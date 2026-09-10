# File: api/scripts/buyer.py
"""Demo buyer: pays the 402 challenge from a local key. USDC-only (EIP-3009 gasless).
Quoted from official examples/python/clients/httpx/main.py (x402 v2, PyPI 2.22.0).
DEV-001: §6 imported x402HttpxClient from `x402.http.clients`; the installed 2.22.0 exposes it
at `x402.http.clients.httpx` (the package __init__ is empty). Bound to the real path.
A GET URL (e.g. /recall) is paid with GET; everything else POSTs — one script, both metered routes."""
import asyncio, json, os, sys
from eth_account import Account
from x402 import x402Client
from x402.http import x402HTTPClient
from x402.http.clients.httpx import x402HttpxClient
from x402.mechanisms.evm import EthAccountSigner
from x402.mechanisms.evm.exact.register import register_exact_evm_client

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8402/answer"
IS_GET = "/recall" in URL or "?" in URL   # /recall is a GET route; /answer is POST
# DEV-002: /answer runs a 24-node LLM derivation AFTER the payment is admitted, so the paid
# request can take >60s. httpx defaults to a 5s read timeout — which fired a ReadTimeout AFTER
# on-chain settlement (money moved, response lost). Raise the read timeout past the derivation.
TIMEOUT = float(os.environ.get("BUYER_TIMEOUT", "180"))


async def main():
    client = x402Client().set_spend_controls({"max_amount_per_payment": "$2"})
    account = Account.from_key(os.environ["BUYER_PRIVATE_KEY"])
    register_exact_evm_client(client, EthAccountSigner(account))
    async with x402HttpxClient(client, timeout=TIMEOUT) as http:
        resp = await http.get(URL) if IS_GET else await http.post(URL, json={})
        body = await resp.aread()
    settle = x402HTTPClient(client).get_payment_settle_response(lambda n: resp.headers.get(n))
    print(json.dumps({"status": resp.status_code, "settle": settle and settle.__dict__,
                      "body": json.loads(body)}, default=str, indent=2))


asyncio.run(main())
