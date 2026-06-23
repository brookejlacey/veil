# Roadmap

Where Veil is and where it is headed. The core primitive is built and tested; everything below extends it.

## Shipped: the core primitive

- Two-party blind negotiation contract
- Encrypted limit submission (seller floor, buyer ceiling)
- Overlap detection on ciphertext (`FHE.gte`)
- Midpoint settlement computed on encrypted values
- Conditional settlement with `FHE.select` (deal vs no-deal, zero leakage on failure)
- Per-party access control on the encrypted result (`FHE.allow`)
- Full lifecycle test suite against the CoFHE mock coprocessor
- One-command narrated end-to-end demo (`npx hardhat demo`)
- Deploy and interaction tasks for Arbitrum Sepolia and Ethereum Sepolia

## Next: multi-term negotiation

- Negotiate more than price: quantity, timeline, and other terms as encrypted fields
- Weighted scoring across encrypted multi-dimensional offers
- Partial-match resolution (agree on some terms, re-negotiate the rest)
- Expiry and timeout mechanics
- A minimal frontend using cofhejs in the browser

## Later: multi-party matching

- N-party matching across multiple buyers and sellers
- Pairing over an encrypted orderbook
- Batch settlement for matched pairs
- Encrypted reputation derived from trade history
- Counter-offers on ciphertext across multiple rounds

## Toward production

- A real-world vertical (OTC desk or B2B procurement) as the first integration
- Escrow: locked funds release on settlement
- Encrypted audit trail with selective disclosure for compliance
- Gas optimization and an upgrade path
- Security audit and mainnet deployment
