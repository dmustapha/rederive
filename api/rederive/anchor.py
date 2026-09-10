# File: api/rederive/anchor.py
"""On-chain receipt anchoring (NN-8, D-19): write h(receipt) into a Base tx's calldata so the
price/reuse claim is anchored, resolvable on Basescan. A 0-value self-tx carrying the hash —
no contract to deploy. Cuttable (CUT-order item 3); when cut, receipts remain committed JSON."""
from __future__ import annotations
import hashlib, json, os
try:                                                           # import-guarded: a missing extra is a clean no-op
    from eth_account import Account
    from web3 import Web3
    HAVE_WEB3 = True
except Exception:
    HAVE_WEB3 = False

RPC = os.environ.get("BASE_RPC", "https://sepolia.base.org")   # DT-10: confirm the working Base Sepolia RPC
CHAIN_ID = int(os.environ.get("BASE_CHAIN_ID", "84532"))
KEY = os.environ.get("ANCHOR_PRIVATE_KEY")                      # SEPARATE key; gas-only; never the buyer/seller key


def receipt_hash(receipt: dict) -> str:
    return hashlib.sha256(json.dumps(receipt, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def anchor_receipt(receipt: dict) -> dict:
    rh = receipt_hash(receipt)
    if not HAVE_WEB3:                                          # web3 not installed (cut) → honest no-op, hash still returned
        return {"anchored": False, "receipt_hash": rh, "reason": "web3 not installed (D-19 cut)"}
    if not KEY:                                                # anchoring cut / unfunded → honest no-op
        return {"anchored": False, "receipt_hash": rh, "reason": "ANCHOR_PRIVATE_KEY unset (cut or unfunded)"}
    w3 = Web3(Web3.HTTPProvider(RPC))
    acct = Account.from_key(KEY)
    tx = {"to": acct.address, "value": 0, "nonce": w3.eth.get_transaction_count(acct.address),
          "gas": 30000, "maxFeePerGas": w3.eth.gas_price * 2, "maxPriorityFeePerGas": w3.eth.gas_price,
          "chainId": CHAIN_ID, "data": "0x" + rh}             # the hash rides in calldata
    signed = acct.sign_transaction(tx)
    txh = w3.eth.send_raw_transaction(signed.raw_transaction).hex()
    return {"anchored": True, "receipt_hash": rh, "tx": txh,
            "explorer": f"https://sepolia.basescan.org/tx/{txh}"}
