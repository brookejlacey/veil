# Veil — Blind Negotiation Protocol

Two parties negotiate without revealing their positions. The contract determines if a deal exists and settles at the encrypted midpoint — powered by Fully Homomorphic Encryption on [Fhenix](https://fhenix.io).

## How It Works

1. **Create** — A seller opens a negotiation with a buyer
2. **Submit** — Each party submits their encrypted limit (seller's minimum, buyer's maximum)
3. **Resolve** — The contract computes on encrypted data: is buyer's max >= seller's min?
4. **Settle** — If yes, settlement = midpoint of both limits. If no, neither side learns the other's number.

Neither party ever sees the other's position. No anchoring. No bluffing. No information leakage — even on a failed negotiation.

## Why FHE?

This is impossible with transparent chains (positions are public) or ZK proofs (can prove validity but can't *compute settlement* on hidden inputs). FHE uniquely enables computation on encrypted data without decryption.

## Quick Start

```bash
pnpm install
pnpm compile
npx hardhat test
```

## Deploy to Testnet

```bash
cp .env.example .env
# Add your private key and RPC URLs

pnpm arb-sepolia:deploy-veil
```

## Project Structure

```
contracts/
  VeilNegotiation.sol  — Core blind negotiation contract
test/
  VeilNegotiation.test.ts — Full lifecycle tests
tasks/
  deploy-veil.ts       — Deployment task
  create-negotiation.ts — Create negotiation task
  submit-limit.ts      — Submit encrypted limit task
ROADMAP.md             — Wave-by-wave development plan
```

## Tech Stack

- **Fhenix CoFHE** — FHE computation layer
- **Solidity 0.8.25** — Smart contracts with encrypted types (euint64, ebool)
- **Hardhat** — Development framework with CoFHE plugin
- **cofhejs** — Client-side encryption/decryption SDK

## FHE Operations Used

- `FHE.gte()` — Encrypted comparison (deal exists?)
- `FHE.add()` / `FHE.div()` — Encrypted arithmetic (midpoint calculation)
- `FHE.select()` — Encrypted conditional (settlement or zero)
- `FHE.allow()` — Access control (who can unseal results)

## License

MIT
