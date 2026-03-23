# Know Your Human (KYH)

**ZK Identity for the Celo Ecosystem**

A unified identity verification gateway for AI agents and dApps. Verify a human once, the credential lives on-chain for 90 days. Any agent reads it for free.

Live: [knowyourhuman.xyz](https://knowyourhuman.xyz)
EAS Schema: [`0x23b867...d5ab`](https://celo.easscan.org/schema/view/0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab) on Celo mainnet
ERC-8004: Agent #24212 on Base

## The Problem

AI agents increasingly need to verify that a wallet belongs to a real person for lending, governance, remittances, compliance. Current solutions are fragmented (each provider has its own API), expensive ($5+ per check), siloed (credentials don't transfer), and Web2 (API keys, dashboards, sign-ups).

There is no shared, reusable, on-chain credential for "this wallet belongs to a verified human."

## The Solution

KYH aggregates multiple verification providers behind one API. Agents pay per verification via x402 micropayments in cUSD. The result is an EAS attestation on Celo with a structured claims layer, free to read forever by anyone.

```
1. GET  /api/check/0xABC...         -> Is this wallet verified? (free, returns claims)
2. POST /api/verify                  -> Start verification (returns 402)
3. Agent pays cUSD via x402          -> Payment on Celo
4. Human completes verification      -> Self / Didit / Human Passport
5. Venice AI reasons over signals    -> Holistic pass/fail decision
6. EAS attestation issued on Celo    -> 90-day credential, free to read
7. GET  /api/evidence/{hash}         -> Structured claims (free)
```

## Four Tiers

| Tier | Price | Provider | What It Proves | What It Doesn't |
|------|-------|----------|---------------|-----------------|
| **Reputation** | Free | Human Passport | Onchain activity pattern consistent with real user | Not identity. Bots with history can pass |
| **Document** | $0.01 | Self Protocol | A real passport was physically tapped (NFC + ZK proof) | Not that the tapper is the passport holder |
| **Biometric** | $0.25 | Didit | A real person is present, matches their gov ID, clean IP | Not sanctions/AML status |
| **Full KYC** | $0.75 | Self + Didit | Passport + biometric + AML/sanctions screening | Complete |

All tiers produce a 90-day EAS credential on Celo. Agents with [Self Agent ID](https://app.ai.self.xyz/) get **20% off** all paid tiers.

## Quick Start

### For Agents: Check a Credential (Free)

```bash
curl https://knowyourhuman.xyz/api/check/0xABC...
```

```json
{
  "verified": true,
  "tier": "biometric",
  "claims": {
    "uniqueHuman": true,
    "over18": true,
    "livenessConfirmed": true,
    "faceMatch": true,
    "notSanctioned": true
  },
  "providers": ["didit"],
  "evidence": {
    "hash": "0xabc123...",
    "url": "https://knowyourhuman.xyz/api/evidence/0xabc123..."
  },
  "attestationUID": "0x23b8...",
  "expiresAt": "2026-06-21T00:00:00Z",
  "onChain": "https://celo.easscan.org/attestation/view/0x23b8..."
}
```

An agent asking "is this person over 18?" gets `claims.over18: true` directly. No parsing, no extra calls.

### For Agents: Request Verification

```bash
curl -X POST https://knowyourhuman.xyz/api/verify \
  -H "Content-Type: application/json" \
  -d '{"agentAddress":"0xYOU","userAddress":"0xHUMAN","tier":"biometric"}'
```

Returns `402 Payment Required` with x402 payment details. After payment, returns a verification URL for the human to complete.

See [docs/AGENT-GUIDE.md](docs/AGENT-GUIDE.md) for the full integration guide.

### For Developers: Run Locally

```bash
git clone https://github.com/explorience/know-your-human.git
cd know-your-human
npm install
cp .env.example .env.local
npm run dev
```

## Architecture

```
+-----------------+     x402 cUSD      +--------------+
|  Agent / dApp   | ------------------> |  KYH Gateway |
|  (ERC-8004 or   | <------------------ |  (Next.js)   |
|   wallet addr)  |   402 / credential  +------+-------+
+-----------------+                            |
                                    +----------+-----------+
                                    v          v           v
                              +----------+ +--------+ +-------+
                              |   Self   | | Didit  | |  HP   |
                              | Protocol | |        | |       |
                              +----+-----+ +---+----+ +---+---+
                                   |           |          |
                                   +-----------+----------+
                                               v
                                    +--------------------+
                                    |    Venice AI       |
                                    |  (reasoning engine |
                                    |   zero retention)  |
                                    +---------+----------+
                                              v
                                   +---------------------+
                                   |  EAS Attestation    |
                                   |  on Celo mainnet    |
                                   |  + Evidence Layer   |
                                   |  (structured claims)|
                                   +---------------------+
```

## Two-Layer Credential Design

**On-chain (EAS attestation):** lean, unopinionated, permanent.
```
uint8   level        // 1=reputation, 2=document, 3=biometric, 4=fullkyc
string  provider     // "self", "didit", "self+didit"
bool    demoMode     // false in production
```

The attestation doesn't know what specific claims were verified. It's a durable primitive that won't need schema migrations.

**Off-chain (evidence layer):** structured, extensible, queryable via API.
```json
{
  "version": "1.0",
  "tier": "biometric",
  "providers": ["didit"],
  "claims": {
    "uniqueHuman": true,
    "over18": true,
    "livenessConfirmed": true,
    "faceMatch": true,
    "notSanctioned": true
  },
  "providerDetails": {
    "didit": {
      "type": "biometric",
      "claims": ["liveness", "face-match", "sanctions"]
    }
  },
  "veniceVerdict": {
    "approved": true,
    "confidence": 0.94,
    "engine": "venice"
  }
}
```

New claims (phone, email, residency, credit score) just need a key added to the evidence layer. No on-chain schema changes. No redeployments.

- `/api/check/:address` returns claims directly in the free response
- `/api/evidence/:hash` serves the full evidence blob (free, no auth)
- Evidence hash is stored as the `evidenceRef` in the attestation

## Venice AI: Private Reasoning Engine

All provider signals are sent to [Venice AI](https://venice.ai) for holistic analysis. Venice makes the actual pass/fail decision, not hard-coded if/else logic. It catches patterns threshold rules miss:

- "Liveness passed but wallet is 2 hours old"
- "Document valid but biometric confidence is borderline"
- "Multiple providers disagree"

Venice retains zero data. The privacy guarantee is structural: data flows through, the decision is made, everything is forgotten. If Venice is unreachable, deterministic fallback scoring kicks in, clearly labeled as "FALLBACK" in the response.

## Self Agent ID Integration

Agents registered with [Self Agent ID](https://app.ai.self.xyz/) get 20% off all paid tiers. The gateway verifies Self Agent ID via signed request headers.

| Tier | Standard Price | Self Agent ID Price |
|------|---------------|-------------------|
| Reputation | Free | Free |
| Document | $0.01 | $0.008 |
| Biometric | $0.25 | $0.20 |
| Full KYC | $0.75 | $0.60 |

## Key Design Decisions

- **No API keys.** Wallets are identity. Agents use ERC-8004, dApps use wallet address.
- **x402 payments.** HTTP-native micropayments. No invoices, no sign-ups.
- **Verify once, read forever.** Verification costs money. Every read is free. Pure public good.
- **90-day validity.** All tiers, same duration. Tier determines assurance, not duration.
- **Zero PII stored.** ZK proofs verify without revealing personal data. Venice retains nothing.
- **Honest tiers.** Each tier documents what it proves AND what it doesn't.
- **Modular providers.** New verification services can be added at any time without schema changes.
- **Claims layer evolves independently.** On-chain schema is permanent. Off-chain evidence is versioned and extensible.

## Tech Stack

- **[Celo](https://celo.org)** - L2 for payments (cUSD) and attestations
- **[EAS](https://attest.org)** - on-chain credential storage
- **[Venice AI](https://venice.ai)** - private reasoning engine (zero data retention)
- **[Self Protocol](https://self.xyz)** - ZK passport proofs (NFC chip scan, zero PII)
- **[Self Agent ID](https://app.ai.self.xyz/)** - on-chain agent identity verification
- **[Didit](https://didit.me)** - biometric KYC, liveness, AML screening
- **[Human Passport](https://passport.human.tech)** - onchain activity scoring
- **[x402](https://www.x402.org)** - HTTP payment protocol for micropayments
- **[ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)** - on-chain agent registry (#24212)
- **[ENS](https://ens.domains)** - human-readable addresses throughout the API
- **ZK-SNARKs** - zero-knowledge proofs for privacy-preserving verification
- **Next.js 14** + TypeScript + Tailwind CSS on Vercel

## Documentation

- [Agent Integration Guide](docs/AGENT-GUIDE.md) - verify a human in 3 API calls
- [EAS Schema Reference](docs/SCHEMA.md) - field conventions, query examples
- [Architecture](docs/ARCHITECTURE.md) - system design, provider integration, payment flow

## License

MIT

## Team

- **Heenal Rajani** ([@heenalr](https://twitter.com/heenalr)) - builder, [Reimagine Co](https://reimagineco.ca)
- **heenai** ([@heen_ai](https://twitter.com/heen_ai)) - AI agent, ERC-8004 #24212

Built for [The Synthesis Hackathon](https://synthesis.devfolio.co), March 2026.
