# Rederive — On-Chain Proof (Base Sepolia)

All settlements are REAL x402 payments on Base Sepolia (chainId eip155:84532), settled by the
keyless testnet facilitator `https://x402.org/facilitator`. USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

## MUST-NOT-CLAIM (honest labeling)

This is a **payment-rail demo, not revenue and not product-market fit.** The buyer wallet
(`0xAEc3F946B3e2508010dDf4cf9D8b18D4E6052120`, a throwaway) was funded from the seller side for
testing; the USDC round-trips back to the seller receive address
(`0xc211C942946011859ca634F22400d80570ED12A5`). What is proven is that the **x402 rail works
end-to-end** — a 402 challenge carrying a dynamic price, an EIP-3009 gasless authorization, and an
on-chain USDC settlement admitted before the resource is served. No revenue or demand is claimed.
The public deploy runs `DEMO_FREE=1` (payment bypassed, badged) and points here for the real settlements.

## Wallets (rule 8 — anchor ≠ buyer ≠ seller, three distinct keys)

| Role | Address | Purpose |
|---|---|---|
| Seller (receive) | `0xc211C942946011859ca634F22400d80570ED12A5` | x402 `pay_to` — receives USDC |
| Buyer (throwaway) | `0xAEc3F946B3e2508010dDf4cf9D8b18D4E6052120` | signs EIP-3009, gasless (facilitator broadcasts) |
| Anchor (throwaway) | `0xb4D15f77554b1C1Dee5f8778829f137b01fc5c50` | gas-only, writes h(receipt) calldata |

## 1. Live settlement — `POST /answer` (dynamic price)

Dynamic-priced 402 (price = `engine.quote(GRAPH)`, drops as the cache warms). Two real settlements:

| Run | Tx | Amount (USDC) | Explorer |
|---|---|---|---|
| Cold (first paid answer) | `0x11ae4043db913b8bd9801aed2b1ff8efd840ded8142d8e38079578aacf163ccb` | 0.48 | https://sepolia.basescan.org/tx/0x11ae4043db913b8bd9801aed2b1ff8efd840ded8142d8e38079578aacf163ccb |
| Warm (cache reuse) | `0x10759f3cc8ab2ee374fdebb1fca52a79f689632d8ad03876bdb0edcf03f27d41` | 0.14 | https://sepolia.basescan.org/tx/0x10759f3cc8ab2ee374fdebb1fca52a79f689632d8ad03876bdb0edcf03f27d41 |

On-chain USDC `Transfer` for both: **from** buyer `0xAEc3F946…2120` **to** seller `0xc211C942…12A5`,
tx `status: 1`. The amount equals the dynamic quote locked at 402-challenge time (§6 known limitation:
price fixed at challenge; a warm run challenged the lower price). Both broadcast gaslessly by the
facilitator (`from` on the outer tx = facilitator `0xd407e409…f1bf`; the buyer only signed EIP-3009).

## 2. On-chain receipt anchor — `POST /anchor` (NN-8)

A 0-value **self-tx** from the anchor address carrying `h(receipt)` in calldata — no contract deployed.

- Anchor tx: `0x926067592ee8873d4ec6b254f465849b9c2fb89b6041187586a0237c3f4a345d`
- Explorer: https://sepolia.basescan.org/tx/0x926067592ee8873d4ec6b254f465849b9c2fb89b6041187586a0237c3f4a345d
- `receipt_hash` (h of `{derived,reused,cutoff}`): `0e6b3e99432850c3dc5291dc44bf4f239122a8ac29d023beb56752b61cb586c3`
- On-chain calldata: `0x0e6b3e99432850c3dc5291dc44bf4f239122a8ac29d023beb56752b61cb586c3`
- **NN-8 holds:** calldata (`0x` + 64-hex) == `h(receipt)`, `status: 1`, `value: 0`, self-tx (from==to==anchor).
- The anchored receipt is committed at `submission/receipt-anchored.json`; `api/scripts/verify_claims.py`
  recomputes `h(receipt)` and asserts equality (independently reproducible).

The `/answer` that set this receipt settled at tx
`0xd84716edd4a392a910738b4cff9c0192bcc5edcc41a9b1267882a925756286c2` (0.05 USDC, DT-4 static-price
path — see note below).

## 3. Second metered route — `GET /recall` (RECALL_PAID=1)

The "sell what memory learned" market: `/recall` is x402-gated (flat `$0.010`) when `RECALL_PAID=1`.

- Recall settle tx: `0x5ed48622c69f72bde3418fa1e22f028287cd23d340c26a9cc00926dbf19673ab`
- Explorer: https://sepolia.basescan.org/tx/0x5ed48622c69f72bde3418fa1e22f028287cd23d340c26a9cc00926dbf19673ab
- On-chain USDC `Transfer`: from buyer → seller, 0.01 USDC, `status: 1`, `settle.success: true`, returned 5 recall hits.

## DT-4 note (static-price path)

The dynamic-price leg is proven by §1 (tx `0x11ae4043` @ 0.48, tx `0x10759f3c` @ 0.14 — two
different challenge prices from the same callable). The throwaway buyer was later low on USDC, so the
`/answer` that seeded the anchored receipt used the DT-4-sanctioned `REDERIVE_STATIC_PRICE=$0.05`
escape hatch (a real payment, real derivation, itemized receipt — only the price source changed, not
the payment path). The dynamic-price claim rests on the §1 hashes, not on that run.

## Verify

```
cd rederive-app && .venv/bin/python api/scripts/verify_claims.py
```
Recomputes the cold/warm receipt numbers from committed JSON and asserts the anchored
`h(receipt)` equals the committed hash (NN-8). Exit 0 = all claims reproduce.

<!-- machine-checkable claims (verify_claims.py) -->
CLAIM:cold_usd=0.48
CLAIM:cold_derived=24
CLAIM:cold_reused=0
CLAIM:warm_usd=0.16
CLAIM:warm_derived=5
CLAIM:warm_reused=19
