# Know Your Human (KYH)
## Product Overview, Positioning & Technical Reference

*Last updated: March 21, 2026*

---

## The One-Liner

**KYC as a service for the Celo ecosystem** — AI agents, dApps, and developers call one API, humans verify once, credentials travel with their wallet forever.

---

## The Problem

Identity verification in web3 is broken in three ways:

1. **Fragmented** — users re-verify for every app. Same friction, same cost, same PII exposure, every time.
2. **Agent-incompatible** — AI agents can't sign enterprise KYC contracts, can't navigate compliance overhead, can't call Sumsub. No KYC API was built for autonomous agents.
3. **Exclusionary** — traditional KYC requires a passport, bank account, and proof of address. The 1.4B unbanked people Celo was built for can't pass it.

Celo just became an Ethereum L2 (March 2025). FederatedAttestations — the old phone-number identity primitive — is gone. EAS is live on Celo. The infrastructure exists but the product layer doesn't.

---

## What KYH Does

One API. Four tiers. Verify once, credential lives on-chain, anyone checks it for free.

### Verification Tiers

| Tier | Price | Provider(s) | What it proves | Credential validity |
|------|-------|-------------|----------------|-------------------|
| **Starter** | $0.001 | Phone + Social stamps | Unique human with mobile + digital presence | 7 days |
| **Basic** | $0.01 | Self Protocol | Real government-issued document (NFC chip) | 30 days |
| **Standard** | $0.25 | Human Passport Individual Verifications | Gov ID + liveness + face match via ZK | 60 days |
| **Enhanced** | $0.75 | Self + Didit + HP Clean Hands | ZK passport + biometric KYC + AML/sanctions | 90 days |

### Credential Format
EAS (Ethereum Attestation Service) attestations on Celo.
Schema: `uint8 level, string provider, bool demoMode`
Queryable by any smart contract or API — free read via `checkCredentialFree()`.

---

## Full Verification Flow

```
AGENT / DAPP                    KYH API                    PROVIDERS                    CELO CHAIN
     |                              |                            |                            |
     |  POST /api/verification      |                            |                            |
     |  { userAddress, level }      |                            |                            |
     |----------------------------->|                            |                            |
     |                              |                            |                            |
     |  402 Payment Required        |                            |                            |
     |  x402 header: 0.25 cUSD      |                            |                            |
     |<-----------------------------|                            |                            |
     |                              |                            |                            |
     |  Pay 0.25 cUSD (auto)        |                            |                            |
     |----------------------------->|                            |                            |
     |                              |                            |                            |
     |                              |--- Verify (parallel) ----->|                            |
     |                              |   Self Protocol ZK proof   |                            |
     |                              |   HP Individual Verif.     |                            |
     |                              |   Didit ID/liveness/AML    |                            |
     |                              |<-- Provider results --------|                            |
     |                              |                            |                            |
     |                              |-- Issue EAS attestation -------------------------------->|
     |                              |   recipient: userAddress                                |
     |                              |   level: 3 (Standard)                                  |
     |                              |   expiresAt: now + 60 days                             |
     |                              |<-- attestation UID --------------------------------------|
     |                              |                            |                            |
     |                              |-- registerVerification() -------------------------------->|
     |                              |   KYHRegistry.sol                                       |
     |                              |   sponsor = agentAddress                                |
     |                              |   costPaid = 250000 (0.25 cUSD)                        |
     |                              |<-- confirmed --------------------------------------------|
     |                              |                            |                            |
     |  { attestationUID,           |                            |                            |
     |    status: "completed",      |                            |                            |
     |    expiresAt, providers }    |                            |                            |
     |<-----------------------------|                            |                            |
```

---

## Credential Reuse Flow

```
SECOND AGENT                   CELO CHAIN (EAS + KYHRegistry)
     |                                       |
     |  checkCredentialFree(uid)             |
     |-------------------------------------->|
     |                                       |
     |  { valid: true,                       |
     |    level: 3,                          |
     |    expiresAt: 1748000000 }            |
     |<--------------------------------------|
     |                                       |
     |  (No payment. No API call.            |
     |   No new verification.)               |
```

---

## Sponsor Economics Flow

```
FIRST VERIFIER (Agent A)
  └─ pays $0.25 for Standard verification
  └─ recorded as sponsor in KYHRegistry

SUBSEQUENT READERS (any agent/dApp)
  └─ pay $0.005 read fee each time

SPLIT (Phase 1: until Agent A earns $0.50 = 2x original cost)
  ├─ $0.002 (40%) → Agent A pendingEarnings
  └─ $0.003 (60%) → KYH protocol treasury

SPLIT (Phase 2: after 2x recouped, forever)
  ├─ $0.0005 (10%) → Agent A pendingEarnings (perpetual)
  └─ $0.0045 (90%) → KYH protocol treasury

Agent A calls claimEarnings() whenever they want to withdraw.
```

Break-even for Agent A at Standard tier ($0.25):
- Needs 125 reads × $0.002 = $0.25 to break even
- Needs 250 reads × $0.002 = $0.50 to hit 2x cap
- After that: passive income at 10% forever

---

## Smart Contract Architecture

```
KYHRegistry.sol (Celo)
│
├── State
│   ├── easContract          → 0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92
│   ├── schemaId             → KYH EAS schema UID
│   ├── paymentToken         → cUSD (0x765DE816845861e75A25fCA122bb6898B8B1282a)
│   ├── readFee              → 5000 (= $0.005 in 6 decimals)
│   │
│   ├── attestationSponsor   → uid → address
│   ├── attestationOriginalCost → uid → uint256
│   ├── sponsorEarned        → uid → uint256
│   └── pendingEarnings      → address → uint256
│
├── Write functions (onlyOwner)
│   ├── registerVerification(uid, sponsor, costPaid, level)
│   └── withdrawProtocolFees(to, amount)
│
├── Write functions (public, costs readFee)
│   ├── readCredential(uid) → (valid, level, expiresAt)
│   └── claimEarnings()
│
└── Read functions (free)
    ├── checkCredentialFree(uid) → (valid, level, expiresAt)
    └── getSponsorInfo(uid) → (sponsor, cost, earned, cap, recouped, rate)
```

---

## Provider Stack

```
TIER        PROVIDER              MECHANISM              COST TO KYH
─────────────────────────────────────────────────────────────────────
Starter     Phone + HP Stamps     REST API + demo         ~$0.000
Basic       Self Protocol         NFC + ZK-SNARK          ~$0.001
Standard    HP Individual Verif.  ZK Gov ID + liveness    ~$0.05-0.10
Enhanced    Self + Didit + HP     ZK + biometric + AML    ~$0.35-0.50
```

All providers have demo mode fallback when API keys not configured.

---

## API Reference

### POST /api/verification

**Request:**
```json
{
  "userAddress": "0x...",
  "agentAddress": "0x...",
  "level": "standard",
  "agentId": 24212
}
```

**Headers:**
```
X-PAYMENT: <x402 payment header with cUSD>
```

**Response:**
```json
{
  "verificationId": "uuid",
  "status": "completed",
  "level": "standard",
  "attestationHash": "0x...",
  "expiresAt": "2026-05-20T00:00:00Z",
  "verificationPlan": {
    "providers": ["human-passport"],
    "checks": ["document", "liveness", "face-match", "humanity"],
    "estimatedCostUSD": "0.25"
  },
  "providerResults": {
    "overallSuccess": true,
    "totalChecks": 4,
    "passedChecks": 4,
    "durationMs": 2341,
    "providers": [...]
  },
  "demoMode": true
}
```

### GET /api/verification/:id

Returns current status of a verification request.

### EAS Direct Query (no API needed)

```typescript
// On-chain — free, no API call
const [valid, level, expiresAt] = await kyhRegistry.checkCredentialFree(attestationUID);

// Via EAS scan
// https://celo.easscan.org/schema/view/<schemaUID>
```

---

## Positioning

**What we are:**
The first KYC API built for AI agents and dApps on Celo. One endpoint, multi-provider routing, EAS credentials, sponsor economics.

**What we're not:**
- Not a verification provider (we don't do the verification — Self/HP/Didit do)
- Not a "credential layer" in some grand abstract sense
- Not competing with Self Protocol, Human Passport, or Didit — they're our engines

**The Stripe analogy:**
Stripe didn't invent payments. They made payments easy for developers. KYH doesn't invent KYC. We make KYC easy for agents and dApp builders — and add the economics that make reuse fair.

**The moat:**
Not the verification tech (providers can always add features). The moat is:
1. Celo-native EAS credentials — first mover, established schemas
2. Sponsor economics contract — novel incentive design, baked into protocol
3. Multi-provider abstraction — provider-agnostic, survives any single provider's evolution

**The genuine risk:**
Self Protocol could build Celo-native attestations and eat our Basic tier. Acknowledged. Our response: KYH's value is in the economics layer and multi-provider abstraction — not in being a better ZK proof generator.

---

## Customer Segments

1. **AI agents** — wedge market, timely in 2026, no existing solution
2. **dApps** — lending, remittance, governance, token sales, age-gated services
3. **Developers** — avoid KYC compliance overhead, one integration vs many
4. **Humans being verified** — portable credentials, verify once, not per-app

The agent framing is what makes KYH novel. The dApp market is what makes it big.

---

## Financial Inclusion Angle

Starter tier is explicitly for Celo's core mission: the unbanked.

Traditional KYC requires:
- Government-issued passport (750M+ adults globally have none)
- Bank account (1.4B adults unbanked)
- Proof of address (impossible for informal settlements)

Starter tier requires:
- Mobile phone (3B+ in the global south)
- Social presence (GitHub, Twitter, Discord, ENS, Lens)
- Phone number uniqueness

Cost: $0.001. Credential validity: 7 days. Good for: microlending, small remittances (<$200), basic dApp access.

---

## Tech Stack

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS
- **Chain:** Celo (Ethereum L2 as of March 2025)
- **Attestations:** EAS (Ethereum Attestation Service) — `celo.easscan.org`
- **Payments:** x402 protocol (HTTP micropayments in cUSD)
- **Identity providers:** Self Protocol, Human Passport, Didit
- **Smart contract:** KYHRegistry.sol (Solidity ^0.8.19)
- **Agent identity:** ERC-8004 (registered on Ethereum mainnet, agent ID 24212)
- **Repo:** github.com/explorience/agent-kyc-gateway

---

## What's NOT Built Yet (Honest)

- EAS schema not yet registered on Celo (needs a tx from our wallet)
- KYHRegistry.sol not yet deployed (needs Hardhat/Foundry setup + gas)
- HP Individual Verifications API not fully wired (demo mode only)
- Real x402 payment verification (demo mode only)
- Domain: knowyourhuman.xyz (purchased, not yet pointed)

All of the above is demo mode for the hackathon. The architecture is production-ready; the live integrations need API keys and deployed contracts.
