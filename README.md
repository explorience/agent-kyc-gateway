# Know Your Human (KYH)

**Your identity follows you to Celo.**

A unified identity verification gateway for AI agents and dApps. Verify a human once — the credential lives on-chain for 90 days. Any agent reads it for free.

🌐 **Live:** [knowyourhuman.xyz](https://knowyourhuman.xyz)
📋 **EAS Schema:** [`0x23b867...d5ab`](https://celo.easscan.org/schema/view/0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab) on Celo mainnet
🤖 **ERC-8004:** Agent #24212 on Base

## The Problem

AI agents increasingly need to verify that a wallet belongs to a real person — for lending, governance, remittances, compliance. Current solutions are fragmented (each provider has its own API), expensive (monthly minimums), siloed (credentials don't transfer), and Web2 (API keys, dashboards, sign-ups).

There is no shared, reusable, on-chain credential for "this wallet belongs to a verified human."

## The Solution

KYH aggregates multiple verification providers behind one API endpoint. Agents pay per verification via x402 micropayments in cUSD. The result is an EAS attestation on Celo — free to read forever by anyone.

```
1. GET  /api/check/0xABC...         → Is this wallet verified? (free)
2. POST /api/verify                  → Start verification (returns 402)
3. Agent pays cUSD via x402          → Payment on Celo
4. Human completes verification      → Self / Didit / HP
5. EAS attestation issued on Celo    → 90-day credential, free to read
```

## Four Tiers

| Tier | Price | Provider | What It Proves | What It Doesn't |
|------|-------|----------|---------------|-----------------|
| **Reputation** | Free | Human Passport | Onchain activity pattern consistent with real user | Not identity — bots with history can pass |
| **Document** | $0.01 | Self Protocol | A real passport was physically tapped (NFC + ZK proof) | Not that the tapper is the passport holder |
| **Biometric** | $0.25 | Didit | A real person is present, matches their gov ID, clean IP | Not sanctions/AML status |
| **Full KYC** | $0.75 | Self + Didit | Passport + biometric + AML/sanctions screening | — |

All tiers produce a 90-day EAS credential on Celo. Agents with [Self Agent ID](https://app.ai.self.xyz/) get **20% off** all paid tiers.

## Quick Start

### For Agents — Check a Credential (Free)

```bash
curl https://knowyourhuman.xyz/api/check/0xABC...
```

```json
{
  "verified": true,
  "tier": "biometric",
  "attestationUID": "0x23b8...",
  "expiresAt": "2026-06-21T00:00:00Z",
  "onChain": "https://celo.easscan.org/attestation/view/0x23b8..."
}
```

### For Agents — Request Verification

```bash
curl -X POST https://knowyourhuman.xyz/api/verify \
  -H "Content-Type: application/json" \
  -d '{"agentAddress":"0xYOU","userAddress":"0xHUMAN","tier":"biometric"}'
```

Returns `402 Payment Required` with x402 payment details. After payment, returns a verification URL for the human to complete.

See [docs/AGENT-GUIDE.md](docs/AGENT-GUIDE.md) for the full integration guide.

### For Developers — Run Locally

```bash
git clone https://github.com/explorience/know-your-human.git
cd know-your-human
npm install
cp .env.example .env.local
# Fill in provider credentials (see docs/DEVELOPER-GUIDE.md)
npm run dev
```

## Architecture

```
┌─────────────────┐     x402 cUSD      ┌──────────────┐
│  Agent / dApp   │ ──────────────────► │  KYH Gateway │
│  (ERC-8004 or   │ ◄────────────────── │  (Next.js)   │
│   wallet addr)  │   402 / credential  └──────┬───────┘
└─────────────────┘                            │
                                    ┌──────────┼──────────┐
                                    ▼          ▼          ▼
                              ┌──────────┐ ┌────────┐ ┌───────┐
                              │   Self   │ │ Didit  │ │  HP   │
                              │ Protocol │ │        │ │       │
                              └────┬─────┘ └───┬────┘ └───┬───┘
                                   │           │          │
                                   └───────────┼──────────┘
                                               ▼
                                    ┌────────────────────┐
                                    │  EAS Attestation   │
                                    │  on Celo mainnet   │
                                    │  (free to read)    │
                                    └────────────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full system design.

## EAS Schema

```
bytes32 credentialType      // keccak256("PASSPORT_ZK"), keccak256("BIOMETRIC_LIVENESS"), etc.
uint8   assuranceLevel      // 0-255, meaning defined per credentialType
bytes32 verificationMethod  // keccak256("SELF_PROTOCOL"), keccak256("DIDIT"), etc.
bytes32 evidenceRef         // off-chain reference (IPFS CID, content hash)
```

Schema UID: `0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab`

Designed to be **permanent, unopinionated, and extensible** — usable by any project for any type of credential. See [docs/SCHEMA.md](docs/SCHEMA.md) for conventions and query examples.

## Self Agent ID Integration

Agents registered with [Self Agent ID](https://app.ai.self.xyz/) get 20% off all paid tiers. The gateway verifies Self Agent ID via signed request headers — no extra steps for the agent.

| Tier | Standard Price | Self Agent ID Price |
|------|---------------|-------------------|
| Reputation | Free | Free |
| Document | $0.01 | $0.008 |
| Biometric | $0.25 | $0.20 |
| Full KYC | $0.75 | $0.60 |

## Key Design Decisions

- **No API keys** — wallets are identity. Agents use ERC-8004, dApps use wallet address.
- **x402 payments** — HTTP-native micropayments. No invoices, no sign-ups.
- **Verify once, read forever** — verification costs money. Every read is free. Pure public good.
- **90-day validity** — all tiers, same duration. Tier determines assurance, not duration.
- **Zero PII stored** — ZK proofs verify without revealing personal data.
- **Multi-chain ready** — deployed on Celo, architected for any EAS-supported chain.
- **Honest tiers** — each tier documents what it proves AND what it doesn't.

## Tech Stack

- **Celo** — L2 for payments (cUSD) and attestations
- **EAS** — on-chain credential storage ([schema](https://celo.easscan.org/schema/view/0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab))
- **Self Protocol** — ZK passport proofs (NFC chip scan, zero PII)
- **Self Agent ID** — on-chain agent identity verification
- **Human Passport** — onchain activity scoring (formerly Gitcoin Passport)
- **Didit** — biometric KYC, liveness, AML screening
- **x402** — HTTP payment protocol for micropayments
- **ERC-8004** — on-chain agent registry (KYH is Agent #24212)
- **Next.js 14** + TypeScript + Tailwind CSS
- **Vercel** — deployment

## Documentation

- [Agent Integration Guide](docs/AGENT-GUIDE.md) — verify a human in 3 API calls
- [EAS Schema Reference](docs/SCHEMA.md) — field conventions, query examples
- [Architecture](docs/ARCHITECTURE.md) — system design, provider integration, payment flow
- [Developer Guide](docs/DEVELOPER-GUIDE.md) — run locally, add providers, deploy

## License

MIT

## Team

- **Heenal Rajani** ([@heenalr](https://twitter.com/heenalr)) — builder, [Reimagine Co](https://reimagineco.ca)
- **heenai** ([@heen_ai](https://twitter.com/heen_ai)) — AI agent, ERC-8004 #24212

Built for [The Synthesis Hackathon](https://synthesis.devfolio.co), March 2026.
