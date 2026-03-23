# Know Your Human (KYH) — Agent Skill

Base URL: `https://knowyourhuman.xyz`

You are an AI agent that needs to verify human identity. KYH is a verification gateway on Celo that issues EAS attestations. No API keys needed — your wallet is your identity.

---

## When to Use KYH

Use KYH when you need to verify that a wallet belongs to a real human. Common scenarios:

- **Before approving a loan** — verify the borrower is a real person (biometric or fullkyc tier)
- **Before governance voting** — prevent sybil attacks (reputation tier is free)
- **Before sending funds** — verify the recipient is human (document tier)
- **Regulatory compliance** — AML/sanctions screening required (fullkyc tier)
- **Airdrop eligibility** — basic humanity check (reputation tier, free)

## Quick Start

### Step 1: Check if Already Verified (Free)

```
GET https://knowyourhuman.xyz/api/check/{walletAddress}
```

Also accepts ENS names:
```
GET https://knowyourhuman.xyz/api/check/vitalik.eth
```

Response if verified:
```json
{
  "verified": true,
  "address": "0x...",
  "ensName": "name.eth",
  "tier": "biometric",
  "attestation": {
    "uid": "0x...",
    "level": "biometric",
    "provider": "didit",
    "demoMode": false,
    "issuedAt": "2026-03-23T...",
    "expiresAt": "2026-06-21T..."
  },
  "claims": {
    "uniqueHuman": true,
    "livenessConfirmed": true,
    "faceMatch": true,
    "notSanctioned": true
  },
  "ipfs": "ipfs://Qm..."
}
```

Response if not verified:
```json
{
  "verified": false,
  "address": "0x...",
  "message": "No credential found. Use POST /api/verification to start verification."
}
```

**If verified, stop here.** The credential is valid for 90 days. No payment needed to read.

### Step 2: Request Verification (If Not Verified)

```
POST https://knowyourhuman.xyz/api/verification
Content-Type: application/json

{
  "agentAddress": "0xYOUR_WALLET",
  "userAddress": "0xHUMAN_WALLET",
  "tier": "reputation"
}
```

For the free reputation tier, verification completes immediately:
```json
{
  "verificationId": "uuid",
  "status": "completed",
  "level": "reputation",
  "attestation": {
    "uid": "0x...",
    "level": "reputation",
    "provider": "human-passport",
    "demoMode": false
  },
  "claims": {
    "uniqueHuman": false,
    "onchainReputation": 59,
    "sybilResistant": true
  },
  "ipfs": "ipfs://Qm..."
}
```

For paid tiers (document, biometric, fullkyc), it returns `402 Payment Required` with x402 payment details. Pay cUSD on Celo, then retry with the payment proof.

### Step 3: Paid Tiers — x402 Payment Flow

When you request a paid tier, the response includes a `402` status with payment instructions in the `WWW-Authenticate` header:

```
HTTP/1.1 402 Payment Required
WWW-Authenticate: x402 ...payment details...
```

Pay the specified amount in cUSD on Celo, then retry the same POST with the payment proof in the header:

```
POST https://knowyourhuman.xyz/api/verification
Authorization: x402 {payment_proof}
Content-Type: application/json

{
  "agentAddress": "0xYOUR_WALLET",
  "userAddress": "0xHUMAN_WALLET",
  "tier": "biometric"
}
```

For biometric and fullkyc tiers, the response includes a `verifyUrl` that the human must open to complete verification (passport scan, liveness check, etc.).

## Tiers — Choose the Right One

| Tier | Price | What It Proves | Limitation |
|------|-------|----------------|------------|
| `reputation` | Free | Onchain activity, sybil resistance score | Bots with history CAN pass |
| `document` | $0.01 cUSD | ZK proof a valid passport exists (Self Protocol) | No face match, no liveness |
| `biometric` | $0.25 cUSD | Liveness + face match + document scan (Didit) | No AML/sanctions check |
| `fullkyc` | $0.75 cUSD | Passport + biometric + AML/sanctions (Self + Didit) | Most expensive, slowest |

## Self Agent ID Discount

If your agent has a [Self Agent ID](https://app.ai.self.xyz/), include these headers for a 20% discount on all paid tiers:

```
x-self-agent-signature: {signature}
x-self-agent-timestamp: {unix_timestamp}
```

## Evidence & Claims

Every verification produces structured claims pinned to IPFS:

```
GET https://knowyourhuman.xyz/api/evidence/{evidenceHash}
```

Claims are boolean flags tracing back to which provider verified them:
- `uniqueHuman` — is this a unique person?
- `over18` / `over21` — age verification
- `livenessConfirmed` — real person present
- `faceMatch` — face matches document
- `notSanctioned` — not on sanctions lists
- `onchainReputation` — numeric reputation score

## Reading Credentials On-Chain (Without KYH)

Query EAS on Celo directly:

**EAS Contract:** `0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92`
**Schema UID:** `0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab`
**Chain:** Celo (42220)

GraphQL:
```graphql
{
  attestations(where: {
    schemaId: { equals: "0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab" }
    recipient: { equals: "0xWALLET" }
    revoked: { equals: false }
  }) {
    id, data, time, expirationTime
  }
}
```

## Schema Fields

```
bytes32 credentialType      // keccak256("PASSPORT_ZK"), keccak256("BIOMETRIC_LIVENESS"), etc.
uint8   assuranceLevel      // 0-255 confidence level
bytes32 verificationMethod  // keccak256("SELF_PROTOCOL"), keccak256("DIDIT"), etc.
bytes32 evidenceRef         // IPFS CID of off-chain evidence JSON
```

## Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Use the credential |
| 402 | Payment required | Pay cUSD on Celo via x402, retry |
| 429 | Rate limited | Wait for Retry-After header |
| 404 | Address not found | No credential exists, start verification |

## Links

- Site: https://knowyourhuman.xyz
- Docs: https://knowyourhuman.xyz/docs
- Explorer: https://knowyourhuman.xyz/explorer
- GitHub: https://github.com/explorience/know-your-human
- EAS Schema: https://celo.easscan.org/schema/view/0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab
- ERC-8004 Agent: https://agentscan.info/agents/24212
