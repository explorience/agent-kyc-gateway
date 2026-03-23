# Agent Integration Guide

**Verify a human in 3 API calls.**

KYH is designed for AI agents. No API keys, no sign-ups, no dashboards. Your wallet is your identity.

## Quick Example

```typescript
// 1. Check if the wallet already has a credential (free)
const check = await fetch("https://knowyourhuman.xyz/api/check/0xUSER_WALLET");
const status = await check.json();

if (status.verified) {
  console.log(`Already verified: ${status.tier}, expires ${status.expiresAt}`);
  // Done. No payment needed.
} else {
  // 2. Request verification (returns 402 Payment Required)
  const res = await fetch("https://knowyourhuman.xyz/api/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentAddress: "0xYOUR_AGENT_WALLET",
      userAddress: "0xUSER_WALLET",
      tier: "biometric" // reputation | document | biometric | fullkyc
    })
  });

  if (res.status === 402) {
    const { paymentRequired } = await res.json();
    // 3. Pay via x402 (cUSD on Celo)
    // paymentRequired.amount = "0.25"
    // paymentRequired.paymentRequirements = base64-encoded payment request
    // Send cUSD to the payment address, then retry with paymentHeader
  }
}
```

## API Reference

### `GET /api/check/{address}`

Check if a wallet has a valid KYH credential. **Always free.**

**Request:**
```
GET https://knowyourhuman.xyz/api/check/0x80370645C98f05Ad86BdF676FaE54afCDBF5BC10
```

**Response (verified):**
```json
{
  "verified": true,
  "address": "0x8037...",
  "tier": "biometric",
  "attestationUID": "0x23b867...",
  "issuedAt": "2026-03-23T02:00:00Z",
  "expiresAt": "2026-06-21T02:00:00Z",
  "onChain": "https://celo.easscan.org/attestation/view/0x23b867...",
  "directQuery": {
    "contract": "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
    "schemaUID": "0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab",
    "chain": "celo",
    "chainId": 42220
  }
}
```

**Response (not verified):**
```json
{
  "verified": false,
  "address": "0x8037...",
  "message": "No credential found. Use POST /api/verify to start verification."
}
```

**Response (expired):**
```json
{
  "verified": false,
  "expired": true,
  "lastTier": "biometric",
  "expiredAt": "2026-06-21T02:00:00Z"
}
```

### `POST /api/verify`

Request a new verification. Returns 402 if payment is needed.

**Request:**
```json
{
  "agentAddress": "0xYOUR_AGENT_WALLET",
  "userAddress": "0xWALLET_TO_VERIFY",
  "tier": "biometric",
  "agentId": 24212,
  "paymentHeader": "base64-encoded-payment-proof"
}
```

**Parameters:**

| Field | Required | Description |
|-------|----------|-------------|
| `agentAddress` | Yes | Your agent's wallet address |
| `userAddress` | Yes | The human's wallet to verify |
| `tier` | No | `reputation` \| `document` \| `biometric` \| `fullkyc` (default: `document`) |
| `agentId` | No | Your ERC-8004 agent ID (optional but recommended) |
| `paymentHeader` | No | x402 payment proof (omit on first call to get 402) |

**402 Response (payment needed):**
```json
{
  "error": "Payment Required",
  "paymentRequired": {
    "amount": "0.25",
    "currency": "cUSD",
    "network": "celo",
    "tier": "biometric",
    "description": "Biometric — liveness + face match + gov ID via Didit",
    "selfAgentId": {
      "verified": false,
      "message": "Get 20% off with Self Agent ID. Register at https://app.ai.self.xyz/"
    }
  }
}
```

**200 Response (verification started):**
```json
{
  "verificationId": "sess_abc123",
  "status": "completed",
  "level": "biometric",
  "attestation": {
    "uid": "0x23b867...",
    "recipient": "0xUSER...",
    "schemaUID": "0x23b867...",
    "onChain": "https://celo.easscan.org/attestation/view/0x23b867..."
  },
  "selfAgentId": { "verified": false },
  "pricing": {
    "tier": "biometric",
    "originalPrice": "0.25",
    "finalPrice": "0.25",
    "discountApplied": false,
    "discountPercent": 0
  }
}
```

## Tiers

| Tier | Price | What Happens | Time |
|------|-------|-------------|------|
| `reputation` | Free | HP scores onchain activity automatically | ~2s |
| `document` | $0.01 | Human scans passport NFC with Self app | ~30s |
| `biometric` | $0.25 | Human takes selfie + scans ID via Didit | ~60s |
| `fullkyc` | $0.75 | Self passport + Didit biometric + AML | ~120s |

### Which tier should I use?

- **Sybil resistance for airdrops/voting:** `reputation` (free, fast, but bots can pass)
- **Prove a real passport exists:** `document` (ZK proof, no biometrics)
- **Prove a real person is present:** `biometric` (liveness + face match)
- **Regulatory compliance:** `fullkyc` (passport + biometric + AML/sanctions)

## Self Agent ID Discount

Agents with [Self Agent ID](https://app.ai.self.xyz/) get 20% off all paid tiers.

To get the discount, sign your requests with your Self Agent ID key:

```typescript
import { SelfAgent } from "@selfxyz/agent-sdk";

const agent = new SelfAgent({ privateKey: "0xYOUR_AGENT_KEY" });

// The SDK adds x-self-agent-signature and x-self-agent-timestamp headers
const response = await agent.fetch("https://knowyourhuman.xyz/api/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agentAddress: agent.address,
    userAddress: "0xHUMAN",
    tier: "biometric"
  })
});
// 402 response will show discounted price: $0.20 instead of $0.25
```

## Reading Credentials On-Chain (Without KYH)

You don't need KYH to read credentials. Query EAS directly:

```typescript
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const EAS_CONTRACT = "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92";
const KYH_SCHEMA = "0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab";

// Query attestations for a wallet directly from EAS on Celo
// See docs/SCHEMA.md for decoding the attestation data
```

Or use the [EAS GraphQL API](https://celo.easscan.org/graphql):

```graphql
{
  attestations(
    where: {
      schemaId: { equals: "0x23b867..." }
      recipient: { equals: "0xUSER..." }
      revoked: { equals: false }
    }
  ) {
    id
    data
    time
    expirationTime
  }
}
```

## Error Handling

| Status | Meaning | Action |
|--------|---------|--------|
| 200 | Credential found / verification complete | Use the data |
| 400 | Invalid request (bad address, invalid tier) | Fix request params |
| 402 | Payment required | Pay via x402, retry |
| 404 | Verification not found | Check the ID |
| 429 | Rate limited | Wait for `Retry-After` header |
| 500 | Server error | Retry with backoff |

## Rate Limits

- Reputation: 100/hour per agent
- Document: 20/hour per agent
- Biometric: 10/hour per agent
- Full KYC: 5/hour per agent

Rate limit headers are included in every response:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 2026-03-23T03:00:00Z
```
