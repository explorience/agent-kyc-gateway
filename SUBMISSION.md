# Know Your Human (KYH) — Hackathon Submission

**Tagline:** Your identity follows you to Celo.

**Live:** [knowyourhuman.xyz](https://knowyourhuman.xyz)
**Code:** [github.com/explorience/know-your-human](https://github.com/explorience/know-your-human)
**EAS Schema:** [`0x23b867...d5ab`](https://celo.easscan.org/schema/view/0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab) on Celo mainnet
**ERC-8004:** Agent #24212 on Base ([basescan](https://basescan.org/tx/0x8e3991a55210e4d8238d4aaf070b6af1c7484d8484bb6847bb6f04120389f566))

---

## What KYH Does

KYH is a unified identity verification gateway for AI agents. One API endpoint. Four verification tiers. Pay-per-use via x402 in cUSD. Result: an EAS attestation on Celo — free to read forever.

```
GET  /api/check/0xABC     → { verified: true, tier: "biometric", expires: "..." }   // FREE
POST /api/verify           → 402 → pay cUSD → human verifies → EAS attestation      // $0-$0.75
```

## Why It Matters

AI agents need to verify human identity for lending, governance, remittances, and compliance. Current KYC is:
- **Fragmented** — each provider has its own API, credentials, format
- **Expensive** — monthly minimums, enterprise contracts
- **Siloed** — credentials don't transfer between apps
- **Web2** — API keys, dashboards, manual sign-ups

KYH solves this with a single endpoint that aggregates multiple providers and produces a portable, on-chain credential.

## What Makes It Novel

1. **First agent-callable KYC service.** No existing service offers multi-provider identity verification accessible via a single HTTP endpoint with on-chain credentials. We searched extensively — nothing exists.

2. **x402 micropayments.** No API keys. No accounts. No sign-ups. The server returns HTTP 402, the agent pays in cUSD on Celo, verification proceeds. The wallet IS the identity.

3. **Multi-provider aggregation.** One API, three verification backends (Self Protocol, Didit, Human Passport), four tiers. Pick the assurance level your use case needs.

4. **Permanent, unopinionated EAS schema.** Four bytes32/uint8 fields designed to last decades. Any project can issue any credential type using this schema without coordination.

5. **Self Agent ID integration.** Agents verified via Self Agent ID get 20% off. Both sides verified: agents prove they're human-backed (Self Agent ID), humans prove their identity (KYH). Ecosystem flywheel.

6. **Honest tiers.** Each tier documents what it proves AND what it doesn't. Reputation scoring gives bots 86/100 — we say that upfront.

## How It Uses Celo

- **x402 payments in cUSD** — Celo's stablecoin enables sub-cent micropayments (free–$0.75)
- **EAS attestations on Celo mainnet** — identity credentials stored as permanent on-chain attestations
- **Celo's low gas** — makes per-verification attestations economically viable (~$0.001/attestation)
- **cUSD stability** — verification costs are predictable, denominated in a stablecoin
- **Self Agent ID registry on Celo** — agent identity verification uses Celo's agent registry

## Tiers

| Tier | Price | Provider | What It Proves | What It Doesn't |
|------|-------|----------|---------------|-----------------|
| **Reputation** | Free | Human Passport | Onchain activity consistent with real user | Not identity — bots with history can pass |
| **Document** | $0.01 | Self Protocol | A real passport was physically present (NFC + ZK) | Not that the tapper is the passport holder |
| **Biometric** | $0.25 | Didit | A real person is present, matches gov ID, clean IP | Not sanctions/AML status |
| **Full KYC** | $0.75 | Self + Didit | Passport + biometric + AML/sanctions | — |

Self Agent ID holders get 20% off all paid tiers.

## EAS Schema

```
bytes32 credentialType      // keccak256("PASSPORT_ZK"), keccak256("BIOMETRIC_LIVENESS"), etc.
uint8   assuranceLevel      // 0-255, meaning per credentialType
bytes32 verificationMethod  // keccak256("SELF_PROTOCOL"), keccak256("DIDIT"), etc.
bytes32 evidenceRef         // off-chain reference (IPFS, content hash)
```

Registered on Celo mainnet. 97 bytes calldata. Revocable. 90-day validity. Designed for permanent, cross-project use.

## Architecture

```
Agent/dApp → x402 cUSD → KYH Gateway → Self Protocol / Didit / HP
                                              ↓
                                     EAS Attestation on Celo
                                              ↓
                                     Free to read forever
```

- Agent identified via ERC-8004 or wallet address
- Self Agent ID verified via signed request headers (ECDSA recovery)
- Multi-provider results aggregated into typed attestations
- Each verification dimension gets its own attestation (composable)

## Multi-Chain Ready

Deployed on Celo. The same schema can be registered on any EAS-supported chain (Base, Optimism, Arbitrum, Ethereum) with a single transaction. Verification providers are chain-agnostic — only attestation issuance and payment are chain-specific.

## Integration

```typescript
// Check if a wallet is verified (free)
const res = await fetch("https://knowyourhuman.xyz/api/check/0xABC...");
const { verified, tier } = await res.json();

// Request verification
const res = await fetch("https://knowyourhuman.xyz/api/verify", {
  method: "POST",
  body: JSON.stringify({ agentAddress: "0xME", userAddress: "0xHUMAN", tier: "biometric" })
});
// Returns 402 → pay cUSD → credential issued
```

Full guide: [docs/AGENT-GUIDE.md](docs/AGENT-GUIDE.md)

## Tech Stack

Next.js 14, TypeScript, Tailwind CSS, Celo (mainnet), EAS, Self Protocol SDK, Self Agent ID SDK, Human Passport API, Didit API v3, x402, ERC-8004, Vercel.

## Tracks

- **Best Agent on Celo** — KYH is a Celo-native service: payments in cUSD, attestations on Celo EAS, Self Agent ID on Celo
- **Best Self Protocol Integration** — ZK passport verification (Document tier) + Self Agent ID for agent identity and discount
- **Agents With Receipts (ERC-8004)** — KYH is Agent #24212, uses ERC-8004 for agent identity, issues EAS receipts for every verification
- **Agent Services on Base** — Multi-chain ready, ERC-8004 registered on Base
- **Open Track** — First-of-kind agent KYC infrastructure

## Team

- **Heenal Rajani** ([@heenalr](https://twitter.com/heenalr)) — builder, [Reimagine Co](https://reimagineco.ca). Community tech, regenerative economics.
- **heenai** ([@heen_ai](https://twitter.com/heen_ai)) — AI agent, ERC-8004 #24212. Built the gateway, integrated providers, designed the schema.

---

Built for [The Synthesis Hackathon](https://synthesis.devfolio.co), March 2026.
