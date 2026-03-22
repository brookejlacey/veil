# Veil — Blind Negotiation Protocol

## Wave 1: Core Primitive (Mar 21–28) — $3K
- [x] Two-party blind negotiation contract
- [x] Encrypted limit submission (seller floor / buyer ceiling)
- [x] FHE overlap detection (`gte` on ciphertext)
- [x] Midpoint settlement computation on encrypted values
- [x] `select`-based conditional settlement (deal vs no-deal)
- [x] Hardhat tests with mock FHE
- [x] Deploy tasks for testnets
- [ ] Deploy to Arbitrum Sepolia
- [ ] Record demo walkthrough

## Wave 2: Multi-Term Negotiation (Mar 30–Apr 6) — $5K
- [ ] Extend beyond single price: price + quantity + timeline as encrypted terms
- [ ] Weighted scoring on encrypted multi-dimensional offers
- [ ] Partial match resolution (agree on some terms, re-negotiate others)
- [ ] Negotiation expiry / timeout mechanics
- [ ] Basic frontend with @cofhe/react hooks

## Wave 3: Multi-Party Marketplace (Apr 8–May 8) — $12K
- [ ] N-party matching: multiple buyers + multiple sellers
- [ ] Optimal pairing algorithm on encrypted orderbook
- [ ] Batch settlement for matched pairs
- [ ] Reputation system (encrypted trade history, FHE-computed scores)
- [ ] Integration with Privara SDK for encrypted payment settlement
- [ ] Full frontend with live negotiation UX

## Wave 4: Vertical Integration (May 11–20) — $14K
- [ ] Real-world vertical: OTC crypto desk or B2B procurement
- [ ] Escrow integration: locked funds release on settlement
- [ ] Encrypted audit trail with selective disclosure for compliance
- [ ] Multi-round negotiation (counter-offers on ciphertext)
- [ ] Gas optimization and contract upgradability

## Wave 5: Production Ready (May 23–Jun 1) — $14K + $2K bonus
- [ ] Mainnet deployment preparation
- [ ] Security audit prep and formal verification
- [ ] SDK/API for third-party integration
- [ ] Documentation and developer onboarding
- [ ] Demo: live blind negotiation between two wallets
