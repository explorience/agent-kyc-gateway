# Architecture

## System Overview

```
                    ┌──────────────────────────────────────────┐
                    │              KYH Gateway                 │
                    │            (Next.js on Vercel)           │
                    │                                          │
                    │  ┌────────────┐  ┌────────────────────┐  │
  Agent/dApp ─────► │  │  x402      │  │  Self Agent ID     │  │
  (HTTP POST)       │  │  Payment   │  │  Verifier          │  │
                    │  │  Gate      │  │  (20% discount)    │  │
                    │  └─────┬──────┘  └────────────────────┘  │
                    │        │                                  │
                    │        ▼                                  │
                    │  ┌─────────────────────────────────┐     │
                    │  │     Provider Router              │     │
                    │  │                                   │     │
                    │  │  reputation → Human Passport API  │     │
                    │  │  document   → Self Protocol SDK   │     │
                    │  │  biometric  → Didit API v3        │     │
                    │  │  fullkyc    → Self + Didit         │     │
                    │  └──────────────┬────────────────────┘     │
                    │                 │                          │
                    │                 ▼                          │
                    │  ┌──────────────────────────┐            │
                    │  │  EAS Attestation Issuer   │            │
                    │  │  (Celo mainnet)            │            │
                    │  └──────────────────────────┘            │
                    └──────────────────────────────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────────────┐
                    │         Celo Blockchain                   │
                    │                                          │
                    │  EAS: 0x72E1d8ccf5299fb36fEfD8CC...     │
                    │  Schema: 0x23b867f11eb49a6d94a64...     │
                    │  Issuer: 0x7f812f3a8695400e3075D...     │
                    │                                          │
                    │  Attestations: free to read forever      │
                    └──────────────────────────────────────────┘
```

## Components

### 1. x402 Payment Gate (`lib/x402.ts`)

Implements the [x402 payment protocol](https://www.x402.org/) for HTTP micropayments.

- Agent sends `POST /api/verify` without payment → gets `402 Payment Required`
- 402 response includes payment requirements (amount, recipient, cUSD address)
- Agent pays on Celo, includes payment proof in retry → verification proceeds
- Reputation tier is free — no 402 returned

**Payment flow:**
```
Agent → POST /api/verify
Server → 402 { amount: "0.25", currency: "cUSD", payTo: "0x7f81..." }
Agent → cUSD transfer on Celo
Agent → POST /api/verify { paymentHeader: "base64-proof" }
Server → 200 { verificationId, attestation }
```

### 2. Self Agent ID Verifier (`lib/selfAgentId.ts`)

Checks incoming requests for Self Agent ID signatures.

- Reads `x-self-agent-signature` and `x-self-agent-timestamp` headers
- Verifies on-chain registration on Celo mainnet Self Agent ID registry
- Verified agents get 20% off all paid tiers
- **Optional** — agents without Self Agent ID can still use KYH at full price

Registry: `0xaC3DF9ABf80d0F5c020C06B04Cced27763355944` (Celo mainnet)

### 3. Provider Router (`lib/providers/`)

Routes verification requests to the appropriate provider(s) based on tier:

| Tier | Providers Called | Checks Performed |
|------|-----------------|-----------------|
| reputation | Human Passport | onchain-activity, sybil-score |
| document | Self Protocol | passport-nfc, zk-proof, age, nationality |
| biometric | Didit | document-scan, liveness, face-match, ip-analysis |
| fullkyc | Self + Didit | All of the above + aml-screening, sanctions-check |

#### Human Passport (`lib/providers/human-passport.ts`)
- REST API: `GET https://api.passport.xyz/v2/models/score/{address}`
- Returns 0-100 score based on onchain activity patterns
- Free API, no authentication cost
- **Limitation:** Bots with sufficient history can score 86+ — this is sybil resistance, not identity verification

#### Self Protocol (`lib/providers/self.ts`)
- SDK: `@selfxyz/core`
- NFC passport chip scan via mobile app
- ZK-SNARK proof generated on device — no PII leaves the phone
- Proves: real passport exists, age, nationality
- Does NOT prove: the scanner is the passport holder

#### Didit (`lib/providers/didit.ts`)
- REST API v3: `x-api-key` header authentication
- Gov ID document scan + passive liveness + face match + IP analysis
- AML/sanctions screening (paid tier, $0.20/check)
- Free tier: 500 verifications/month (ID + liveness + face match + IP)

### 4. EAS Attestation Issuer (`lib/eas.ts`)

Issues on-chain attestations on Celo mainnet using Ethereum Attestation Service.

- Schema: `bytes32 credentialType, uint8 assuranceLevel, bytes32 verificationMethod, bytes32 evidenceRef`
- Schema UID: `0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab`
- All attestations: 90-day validity, revocable
- Issuer address: `0x7f812f3a8695400e3075DAC2d5008CB068D162e7`
- Gas paid from issuer wallet (funded with CELO)

### 5. Credential Check (`app/api/check/[address]/route.ts`)

Free read endpoint. Any agent or dApp can check a wallet's verification status without payment.

- Returns latest credential, tier, attestation UID, expiry
- Includes `directQuery` object with EAS contract address and schema UID for on-chain queries
- Cached (5 min) for performance

### 6. ERC-8004 Agent Identity (`lib/erc8004.ts`)

Optional agent identity verification. If an agent provides its ERC-8004 ID, KYH checks on-chain registration. Unregistered agents are warned but not blocked.

KYH itself is registered as ERC-8004 Agent #24212 on Base.

## API Routes

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/check/{address}` | GET | None | Free credential check |
| `/api/verify` | POST | x402 | Start/complete verification |
| `/api/verification/{id}/callback` | POST | Webhook | Provider callbacks |
| `/api/stats` | GET | None | Public statistics |

## Data Flow: Full KYC Example

```
1. Agent calls POST /api/verify { tier: "fullkyc", userAddress: "0xABC" }
2. No payment → 402 returned with cUSD amount ($0.75 or $0.60 with Self Agent ID)
3. Agent pays cUSD on Celo, retries with paymentHeader
4. Gateway starts parallel verification:
   a. Self Protocol: generates QR code → human scans passport NFC → ZK proof returned
   b. Didit: creates session → human takes selfie + scans ID → liveness + face match + AML
5. Both providers return results
6. Gateway issues EAS attestations on Celo:
   - PASSPORT_ZK attestation (Self Protocol result)
   - BIOMETRIC_LIVENESS attestation (Didit result)
   - AML_SCREENING attestation (Didit result)
   - COMPOSITE_KYC summary attestation (linked via refUID)
7. Returns attestation UIDs to agent
8. Any agent can now read these credentials for free via /api/check or direct EAS query
```

## Security Model

- **No API keys** — eliminates key rotation, leakage, and management overhead
- **Wallet = identity** — agents identified by ERC-8004 or wallet address
- **Self Agent ID signatures** — ECDSA recovery, not header trust (can't be spoofed)
- **x402 payment verification** — on-chain payment proof required before verification
- **Rate limiting** — per-agent, per-tier limits prevent abuse
- **ZK proofs** — no PII stored or transmitted. Only proof of verification.
- **Revocable attestations** — compromised credentials can be revoked by the issuer

## Deployment

- **Runtime:** Vercel (serverless, edge-compatible)
- **Domain:** knowyourhuman.xyz (Cloudflare DNS)
- **Database:** In-memory for demo (Redis/PostgreSQL for production)
- **Secrets:** Vercel environment variables (issuer key, provider API keys)

## Multi-Chain Architecture

KYH is deployed on Celo but architected for multi-chain deployment:

```
┌─────────┐  ┌──────┐  ┌──────────┐  ┌─────────┐
│  Celo   │  │ Base │  │ Optimism │  │ Arb     │
│  EAS    │  │ EAS  │  │ EAS      │  │ EAS     │
│ Schema  │  │ Same │  │ Same     │  │ Same    │
│ 0x23b.. │  │ hash │  │ hash     │  │ hash    │
└─────────┘  └──────┘  └──────────┘  └─────────┘
     ▲            ▲          ▲            ▲
     │            │          │            │
     └────────────┴──────────┴────────────┘
                       │
                 ┌─────┴─────┐
                 │ KYH       │
                 │ Gateway   │
                 │ (routes   │
                 │  to chain)│
                 └───────────┘
```

To add a new chain:
1. Register the same schema on that chain's EAS deployment (one tx)
2. Fund an issuer wallet on that chain
3. Accept that chain's stablecoin as payment
4. Add chain config to the gateway router

The verification providers (Self, Didit, HP) are completely chain-agnostic — they verify humans via APIs, not on-chain. Only the attestation issuance and payment acceptance are chain-specific.
