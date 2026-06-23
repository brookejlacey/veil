# Veil

**A blind negotiation protocol.** Two parties submit encrypted limits. An onchain contract decides whether a deal exists and settles at the encrypted midpoint, leaking nothing about either position, even when the negotiation fails.

Built on [Fhenix](https://fhenix.io) CoFHE (Fully Homomorphic Encryption on EVM).

## Live on Sepolia

`VeilNegotiation` is deployed and source-verified on Ethereum Sepolia (a Fhenix CoFHE testnet).

- **Contract:** [`0xe0cCA01C8bB5961a97A1264F38aba01ABD997e7b`](https://sepolia.etherscan.io/address/0xe0cCA01C8bB5961a97A1264F38aba01ABD997e7b)
- **Verified source (Sourcify, exact match):** [sourcify.dev](https://sourcify.dev/#/lookup/0xe0cCA01C8bB5961a97A1264F38aba01ABD997e7b)

## Why FHE, and not ZK or a transparent chain

A negotiation has a hard requirement that most privacy tooling cannot meet: the chain has to *compute on numbers it is not allowed to see*. Walk through the options.

**Transparent chain (Ethereum, an L2, anything with public state).** A price floor or ceiling written to storage is readable by everyone. Even "commit then reveal" leaks: the reveal step exposes the loser's number, so a failed negotiation hands your counterparty your walk-away price for free. The whole point of a sealed negotiation is that the bad outcome stays sealed too.

**Zero-knowledge proofs.** ZK is the right tool for *proving a statement about data you hold* ("I know a preimage", "my balance covers this transfer"). It is the wrong shape here. ZK proves a fact to a verifier; it does not let an untrusted third party *combine two parties' private inputs and compute a new private output*. To settle at a midpoint, someone has to add two hidden numbers and divide. With ZK, that someone is a trusted party who sees both inputs, which is exactly the party we are trying to remove.

**Fully Homomorphic Encryption.** FHE lets the contract run arithmetic and comparisons directly on ciphertext. The contract computes `buyerMax >= sellerMin` and `(sellerMin + buyerMax) / 2` without ever decrypting either limit. No trusted middleman, no reveal step, no leak on failure. The encrypted result is then released only to the two parties.

The insight: a blind double-sided settlement needs *computation on jointly-private inputs by an untrusted operator*. That is the one thing FHE does and neither transparent state nor ZK can.

## The flow

```
   Party A (seller)                 VeilNegotiation                  Party B (buyer)
   floor = 80 (secret)              contract (onchain)               ceiling = 120 (secret)
        │                                  │                                  │
        │   createNegotiation(B) ──────────►                                  │
        │                                  │  status: Open                    │
        │                                  │                                  │
        │   submitLimit(enc(80)) ──────────►                                  │
        │                                  │  stores euint64 limitA           │
        │                                  ◄────────── submitLimit(enc(120))   │
        │                                  │  stores euint64 limitB           │
        │                                  │                                  │
        │                          ┌───────┴────────┐                         │
        │                          │  resolve() on  │  all on ciphertext:     │
        │                          │  encrypted data│  dealExists = gte(B,A)  │
        │                          │                │  mid = (A + B) / 2       │
        │                          │                │  payout  = select(...)  │
        │                          └───────┬────────┘                         │
        │                                  │  FHE.decrypt(dealExists)         │
        │   finalize() ────────────────────►                                  │
        │                                  │  Settled  ✅   or   NoDeal  ❌    │
        │                                  │                                  │
        ◄──── getSettlement() = 100 ───────┤──────── getSettlement() = 100 ───►
                                           │
        If NoDeal, neither number is ever revealed. The chain says only "no deal".
```

1. **Create.** A opens a negotiation against a named counterparty B.
2. **Submit.** Each party encrypts their limit client side and submits the ciphertext. Nothing readable touches the chain.
3. **Resolve.** Once both limits are in, the contract computes `dealExists` and the midpoint *on the encrypted values* and requests decryption of the single boolean outcome.
4. **Settle.** If a deal exists, settlement is the midpoint, unsealable only by the two parties. If not, the contract emits `NoDeal` and both numbers stay secret forever.

No anchoring. No bluffing. No information leakage, including on a failed deal.

## Run the demo

One command runs the entire encrypted lifecycle against the local CoFHE mocks and narrates each step:

```bash
pnpm install
npx hardhat demo
```

```
  5. Finalize once the encrypted comparison is decrypted
  ✅ DEAL: settled at the encrypted midpoint
     settlement price = 100
     (expected midpoint = 100)
     neither side ever saw the other's limit
```

Try the no-deal path (limits that do not overlap reveal nothing):

```bash
npx hardhat demo --seller 150 --buyer 100
```

## Quick start

```bash
pnpm install
npx hardhat compile
npx hardhat test
```

The test suite covers the full lifecycle: create, encrypted submit, auto-resolve, deal settlement at the midpoint, the no-deal path, access control, cancellation, and double-submit protection.

## Deploy to a testnet

```bash
cp .env.example .env       # add PRIVATE_KEY and RPC URLs
npx hardhat deploy-veil --network arb-sepolia
npx hardhat create-negotiation --counterparty 0x... --network arb-sepolia
npx hardhat submit-limit --id 0 --limit 80 --network arb-sepolia
```

## What the contract computes (all on ciphertext)

| Operation        | FHE call                          | Purpose                                  |
| ---------------- | --------------------------------- | ---------------------------------------- |
| Deal exists?     | `FHE.gte(limitB, limitA)`         | Buyer ceiling meets or beats seller floor |
| Midpoint         | `FHE.add` then `FHE.div`          | Fair settlement between the two limits   |
| Conditional pay  | `FHE.select(dealExists, mid, 0)`  | Midpoint on a deal, zero otherwise       |
| Access control   | `FHE.allow`                       | Only the two parties can unseal results  |

## Project layout

```
contracts/VeilNegotiation.sol     Core blind negotiation contract
test/VeilNegotiation.test.ts      Full lifecycle tests
tasks/demo.ts                     One-command narrated end-to-end demo
tasks/deploy-veil.ts              Deploy task
tasks/create-negotiation.ts       Open a negotiation
tasks/submit-limit.ts             Submit an encrypted limit
ROADMAP.md                        Where this is going
```

## Tech stack

- **Fhenix CoFHE** for the FHE computation layer
- **Solidity 0.8.25** with encrypted types (`euint64`, `ebool`)
- **Hardhat** with the CoFHE plugin and mock coprocessor for local testing
- **cofhejs** for client side encryption and unsealing

## License

MIT
