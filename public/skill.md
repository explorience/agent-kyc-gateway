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

Response if verified:
```json
{
  "verified": true,
  "tier": "biometric",
  "attestationUID": "0x...",
  "expiresAt": "2026-06-21T00:00:00Z",
  "onChain": "https://celo.easscan.org/attestation/view/0x..."
}
```

Response if not verified:
```json
{ "verified": false }
```

**If verified, stop here.** The credential is valid for 90 days. No payment needed.

### Step 2: Request Verification (If Not Verified)

```
POST https://knowyourhuman.xyz/api/verify
Content-Type: application/json

{
  "agentAddress": "0xYOUR_WALLET",
  "userAddress": "0xHUMAN_WALLET",
  "tier": "biometric"
}
```

Returns `402 Payment Required`:
```json
{
  "paymentRequired": {
    "amount": "0.25",
    "currency": "cUSD",
    "network": "celo"
  }
}
```

### Step 3: Pay and Complete

Send cUSD on Celo to the payment address, then retry POST /api/verify with the payment proof. The response includes a `verifyUrl` — send this to the human to complete verification.

### Step 4: Credential Issued

Once the human completes verification, an EAS attestation is issued on Celo. Valid for 90 days. Free to read forever via GET /api/check or direct EAS query.

## Tiers — Choose the Right One

| Tier | Price | Use When | Time |
|------|-------|----------|------|
| `reputation` | Free | Sybil resistance for airdrops, voting. Bots with history CAN pass. | ~2s |
| `document` | $0.01 | Need proof a real passport exists. No face match. | ~30s |
| `biometric` | $0.25 | Need proof a real person is present and matches their ID. | ~60s |
| `fullkyc` | $0.75 | Need passport + biometric + AML/sanctions for compliance. | ~120s |

## Self Agent ID Discount

If you have a [Self Agent ID](https://app.ai.self.xyz/), sign your requests with your agent key. You get 20% off all paid tiers automatically.

## Reading Credentials On-Chain (Without KYH)

You can bypass KYH entirely and query EAS on Celo directly:

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
bytes32 evidenceRef         // off-chain evidence reference
```

## Error Codes

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Success | Use the credential |
| 402 | Payment required | Pay cUSD on Celo, retry |
| 429 | Rate limited | Wait for Retry-After header |

## Links

- Site: https://knowyourhuman.xyz
- Docs: https://knowyourhuman.xyz/docs
- GitHub: https://github.com/explorience/know-your-human
- EAS Schema: https://celo.easscan.org/schema/view/0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab
