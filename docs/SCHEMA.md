# EAS Schema Reference

**Schema UID:** `0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab`
**Chain:** Celo mainnet (42220)
**EAS Contract:** `0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92`
**Registration TX:** [celoscan.io/tx/a91c20f4...](https://celoscan.io/tx/a91c20f4157a446fd8f53f12cbca30ffa3e79bfd28195c6e64a8cc889c356138)

## Schema Definition

```solidity
bytes32 credentialType, uint8 assuranceLevel, bytes32 verificationMethod, bytes32 evidenceRef
```

**Total calldata: ~97 bytes.** Fits in 4 EVM words. Gas-efficient by design.

## Field Reference

### `credentialType` (bytes32)

**What it is:** The keccak256 hash of a human-readable credential category.

**Why bytes32:** Gas-efficient (one EVM word), self-documenting via the hash, extensible without schema changes.

**Convention:** `keccak256("CATEGORY_NAME")` using SCREAMING_SNAKE_CASE.

| Credential Type | Hash | Used By |
|----------------|------|---------|
| `PASSPORT_ZK` | `keccak256("PASSPORT_ZK")` | Document tier, Full KYC |
| `BIOMETRIC_LIVENESS` | `keccak256("BIOMETRIC_LIVENESS")` | Biometric tier, Full KYC |
| `SOCIAL_SCORE` | `keccak256("SOCIAL_SCORE")` | Reputation tier |
| `GOV_ID_SCAN` | `keccak256("GOV_ID_SCAN")` | Biometric tier |
| `AML_SCREENING` | `keccak256("AML_SCREENING")` | Full KYC |
| `AGE_VERIFICATION` | `keccak256("AGE_VERIFICATION")` | Document tier |
| `NATIONALITY_CONFIRMED` | `keccak256("NATIONALITY_CONFIRMED")` | Document tier |
| `SANCTIONS_CLEAR` | `keccak256("SANCTIONS_CLEAR")` | Full KYC |
| `IP_ANALYSIS` | `keccak256("IP_ANALYSIS")` | Biometric, Full KYC |
| `COMPOSITE_KYC` | `keccak256("COMPOSITE_KYC")` | Full KYC (summary attestation) |

**Extensibility:** Any project can define new credential types. Just hash your category name. No coordination needed.

```typescript
import { keccak256, toUtf8Bytes } from "ethers";

// Define your own credential type
const myType = keccak256(toUtf8Bytes("PROOF_OF_ADDRESS"));
```

### `assuranceLevel` (uint8)

**What it is:** A 0-255 value indicating confidence/assurance. The meaning is defined by each `credentialType`, not globally.

**Why uint8:** Most unopinionated encoding. No project-specific tier names baked in. Any scale fits.

**KYH conventions:**

| credentialType | 0 | 1-50 | 51-150 | 151-255 |
|---------------|---|------|--------|---------|
| SOCIAL_SCORE | No data | Low activity | Moderate activity | High activity |
| PASSPORT_ZK | Not verified | — | Verified (age/nationality only) | Verified (full) |
| BIOMETRIC_LIVENESS | Not verified | — | Passive liveness passed | Active liveness passed |
| AML_SCREENING | Not screened | — | Clear (no matches) | Clear (confirmed review) |

**For reading agents:** You don't need to know KYH's scale. Just check:
- `assuranceLevel > 0` → some verification was performed
- `assuranceLevel >= 100` → meaningful verification
- `assuranceLevel >= 200` → high-confidence verification

### `verificationMethod` (bytes32)

**What it is:** The keccak256 hash of the method/provider used.

| Method | Hash |
|--------|------|
| `SELF_PROTOCOL` | `keccak256("SELF_PROTOCOL")` |
| `DIDIT` | `keccak256("DIDIT")` |
| `HUMAN_PASSPORT` | `keccak256("HUMAN_PASSPORT")` |
| `SELF+DIDIT` | `keccak256("SELF+DIDIT")` |

**Combined methods:** For multi-provider verifications, concatenate provider names with `+`.

### `evidenceRef` (bytes32)

**What it is:** A 32-byte reference to off-chain evidence. Storage-agnostic.

**Options:**
- **IPFS CID:** First 32 bytes of CIDv1 (base32 encoded)
- **Content hash:** `keccak256(evidenceJSON)`
- **Arweave TX ID:** 32 bytes, fits naturally
- **Ceramic stream ID:** First 32 bytes
- **None:** `0x0000...0000` (evidence stored elsewhere or not applicable)

**What evidence contains (off-chain JSON):**
```json
{
  "version": "1.0",
  "issuedAt": "2026-03-23T02:00:00Z",
  "providerDetails": [
    {
      "provider": "self_protocol",
      "sessionId": "sess_abc",
      "checks": ["passport_nfc", "zk_proof"],
      "passed": true
    }
  ],
  "agentAddress": "0x...",
  "policyVersion": "kyh-v1"
}
```

## Built-in EAS Fields (Don't Duplicate)

EAS provides these automatically — they're NOT in our schema:

| EAS Field | What It Is | KYH Usage |
|-----------|-----------|-----------|
| `recipient` | Address being attested about | The human's wallet |
| `attester` | Who issued the attestation | KYH issuer (`0x7f81...62e7`) |
| `time` | When issued | Unix timestamp |
| `expirationTime` | When it expires | +90 days from issuance |
| `revocable` | Can it be revoked? | Yes (revocable=true) |
| `refUID` | Links to another attestation | Chain attestations together |

## Querying Attestations

### Via EAS GraphQL (recommended for indexed queries)

```graphql
# Find all KYH credentials for a wallet
{
  attestations(
    where: {
      schemaId: { equals: "0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab" }
      recipient: { equals: "0xUSER_ADDRESS" }
      revoked: { equals: false }
    }
    orderBy: { time: desc }
  ) {
    id
    data
    time
    expirationTime
    attester
  }
}
```

### Via Smart Contract (on-chain, trustless)

```solidity
import { IEAS } from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

IEAS eas = IEAS(0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92);

Attestation memory att = eas.getAttestation(attestationUID);

// Check validity
require(!att.revocationTime, "Revoked");
require(att.expirationTime > block.timestamp, "Expired");

// Decode data
(bytes32 credentialType, uint8 assuranceLevel, bytes32 verificationMethod, bytes32 evidenceRef)
  = abi.decode(att.data, (bytes32, uint8, bytes32, bytes32));

// Check credential
require(assuranceLevel >= 100, "Insufficient assurance");
```

### Via KYH API (simplest)

```
GET https://knowyourhuman.xyz/api/check/0xUSER_ADDRESS
```

## Multi-Dimensional Queries

KYH issues **one attestation per verification dimension**, not one per tier. A Full KYC produces multiple attestations:

1. `credentialType = PASSPORT_ZK` (from Self Protocol)
2. `credentialType = BIOMETRIC_LIVENESS` (from Didit)
3. `credentialType = AML_SCREENING` (from Didit)

This lets reading agents pick exactly the dimensions they need:

```
// Lending protocol: needs biometric + AML
// Query: BIOMETRIC_LIVENESS with assuranceLevel >= 100 AND AML_SCREENING with assuranceLevel >= 100

// Governance: just needs sybil resistance
// Query: SOCIAL_SCORE with assuranceLevel >= 50

// Remittance: needs passport + AML
// Query: PASSPORT_ZK AND AML_SCREENING
```

## Multi-Chain Future

The schema is chain-agnostic. The same schema string can be registered on any EAS-supported chain:

- Ethereum mainnet
- Base
- Optimism
- Arbitrum
- Scroll

Same fields, same meaning, same conventions. "Your identity follows you" — anywhere EAS is deployed.

## Design Principles

1. **Modular over monolithic** — one schema for all credential types
2. **Don't duplicate EAS built-ins** — recipient, attester, time, expiry are already handled
3. **bytes32 over string** — 97 bytes vs potentially kilobytes, massive gas savings
4. **Extend via references** — evidenceRef points to arbitrary off-chain data
5. **Zero opinion on naming** — conventions are documented, not enforced
6. **Built to last** — no project-specific fields, no tier names, no version numbers in schema
