# Celo KYC Gateway — Technical Specification

**Version:** 1.0  
**Status:** Final  
**Last Updated:** March 14, 2026  
**Target:** Celo Hackathon (March 18, 2026)

---

## 1. Project Overview

### 1.1 Name & Type
- **Name:** Agent KYC Gateway (or "Celo KYC Gateway")
- **Type:** Privacy-preserving identity verification service for AI agents
- **Chain:** Celo (Ethereum L2 via OP Stack)
- **Deployment:** Alfajores testnet → Mainnet

### 1.2 Problem Statement
AI agents operating on-chain need to verify that their users are real, verified humans—but:
- Agents cannot perform KYC themselves (not persons, no legal entity)
- Existing KYC solutions expose PII (violates privacy-preserving ethos)
- No standardized verification standard exists across chains
- Centralized KYC is expensive, creating barriers for small agents

### 1.3 Solution
A verification gateway where:
1. Agent requests verification (configurable level: basic/standard/enhanced)
2. User completes verification via Self Protocol (passport NFC + ZK proofs)
3. User receives a credential (not raw PII)
4. Gateway returns an attestation to the agent: "passed KYC level 2" or "verified resident of Canada"
5. Agent receives compliance assurance; users retain privacy

### 1.4 Why This Wins
- **Multi-chain potential:** Works on any EVM chain (Celo, Base, Arbitrum, Ethereum)
- **x402 payments:** Micropayment-native from day one
- **Privacy-first:** Zero-knowledge proofs keep PII off-chain
- **Serviceable business:** Verification fees as sustainable revenue
- **Ecosystem alignment:** Extends Celo's identity infrastructure (Self Protocol)

---

## 2. Core Features

### 2.1 Verification Levels

| Level | Checks Performed | Fee (cUSD) | Validity | Use Case |
|-------|------------------|------------|----------|----------|
| **Basic** | Phone/Email verification | $0.25 | 30 days | Social engagement, airdrop protection, Sybil resistance |
| **Standard** | + Government ID document | $1.50 | 90 days | DeFi interactions, trading with limits, NFT purchases |
| **Enhanced** | + Biometric (selfie) + sanctions screening | $5.00 | 90 days | High-value transactions, lending, regulated assets |

### 2.2 API-First Verification

**Core API Capabilities:**
- RESTful endpoints for agent verification requests
- Webhook callbacks for verification completion
- Attestation lookup by wallet address
- Batch verification for high-volume agents
- Rate limiting and abuse prevention

### 2.3 Privacy-Preserving Attestations

- **On-chain:** Only attestation hash stored (no PII)
- **Off-chain:** Verification proofs stored in encrypted Redis cache
- **Selective disclosure:** Agents receive status only, never raw documents
- **Time-limited:** Credentials expire (configurable per level)

### 2.4 Credential Caching

- Users complete verification once, receive 30-90 day credential
- Agents query cached attestation instead of re-verifying
- Cache invalidation on credential expiry or revocation
- Optional: User can request early credential revocation

---

## 3. Architecture

### 3.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KYC Gateway                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐ │
│  │   Agent      │    │  Gateway     │    │   Self Protocol      │ │
│  │ (Requester)  │───▶│    API       │───▶│   (Verification)      │ │
│  └──────────────┘    └──────┬───────┘    └──────────────────────┘ │
│         │                    │                     │                │
│         │                    │                     │                │
│         │              ┌─────┴─────┐               │                │
│         │              │           │               │                │
│         │              ▼           ▼               ▼                │
│         │        ┌─────────┐ ┌─────────┐    ┌─────────────┐        │
│         │        │  Redis  │ │  IPFS   │    │  ZK Proof   │        │
│         │        │  Cache  │ │ Storage │    │  Verification│        │
│         │        └─────────┘ └─────────┘    └─────────────┘        │
│         │              │           │               │                │
│         └──────────────┼───────────┼───────────────┘                │
│                        ▼           ▼                                 │
│               ┌─────────────────────────┐                           │
│               │  Federated Attestations │                           │
│               │      (Celo On-Chain)     │                           │
│               └─────────────────────────┘                           │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Architecture

#### 3.2.1 Gateway API (Next.js)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/verification/request` | POST | Agent requests verification for user |
| `/api/verification/:id/status` | GET | Check verification status |
| `/api/verification/:id/complete` | POST | Webhook: Self Protocol completion |
| `/api/attestation/:address` | GET | Query on-chain attestation |
| `/api/levels` | GET | Get available verification levels |
| `/api/agent/info` | GET | Get agent's verification quota/fees |

#### 3.2.2 Data Flow

```
1. Request Phase
   Agent ──POST──▶ /api/verification/request
                    │
                    ├──▶ Validate agent signature
                    ├──▶ Create verification session (Redis)
                    ├──▶ Generate payment intent (cUSD)
                    └──▶ Return verification URL + session ID

2. Verification Phase
   User ──▶ Self Protocol Widget
            │
            ├──▶ NFC passport scan (Enhanced)
            ├──▶ ID document upload (Standard)
            ├──▶ Phone/Email verification (Basic)
            └──▶ ZK proof generation

3. Attestation Phase
   Self Protocol ──Webhook──▶ /api/verification/:id/complete
                              │
                              ├──▶ Verify ZK proof
                              ├──▶ Store attestation (Redis + IPFS)
                              ├──▶ Register on-chain (FederatedAttestations)
                              └──▶ Notify agent (webhook)

4. Query Phase
   Agent ──GET──▶ /api/attestation/:address
                  │
                  ├──▶ Check Redis cache
                  ├──▶ Verify on-chain attestation
                  └──▶ Return attestation status
```

### 3.3 Smart Contract: FederatedAttestations

**Testnet Address:** `0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3` (Alfajores)

**Contract Interface:**

```solidity
interface FederatedAttestations {
  function createAttestation(
    bytes32 obfuscatedIdentifier,
    address account,
    string memory claim
  ) external returns (bytes32);

  function getAttestation(
    bytes32 obfuscatedIdentifier,
    address account
  ) external view returns (Attestation memory);
}
```

**Attestation Schema:**
```json
{
  "version": "1.0",
  "level": "standard",
  "country": "CA",
  "ageVerified": true,
  "issuedAt": 1752537600,
  "expiresAt": 1755129600,
  "issuer": "0xGATEWAY_ADDRESS",
  "schema": "kyc-gateway/v1"
}
```

### 3.4 Payment Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    Agent    │────▶│  Gateway    │────▶│    Celo     │
│  (cUSD)     │     │  Treasury  │     │  StableToken│
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      │                   ├──▶ Verification fee (90%)
      │                   └──▶ Self Protocol quota (10%)
```

**Payment Options:**
1. **Direct cUSD** — Agent pays verification fee directly
2. **x402 (Future)** — Micropayment protocol for per-request payments
3. **Subscription (Future)** — Monthly quota for high-volume agents

---

## 4. Integration Points

### 4.1 Self Protocol Integration

| Component | Description |
|-----------|-------------|
| **Self Pass** | ZK proof-of-humanity via passport NFC |
| **Self Connect** | Phone number → wallet address mapping |
| **ZK Circuits** | Privacy-preserving credential proofs |

**Integration Method:**
- Self Protocol SDK for embedded verification widget
- ZK proof verification on gateway side
- On-chain credential registry

### 4.2 Agent Identity (ERC-8004)

**Future Integration:**
- Agents register via ERC-8004 (Trustless Agents)
- Gateway validates agent identity before accepting requests
- Creates audit trail for compliance

### 4.3 x402 Payments

**Future Integration:**
- Per-request micropayments
- Streaming payments for high-volume agents
- Automatic quota management

### 4.4 Multi-Chain Expansion

| Chain | Status | Notes |
|-------|--------|-------|
| **Celo** | Primary | Alfajores → Mainnet |
| **Base** | Planned | EVM-compatible |
| **Arbitrum** | Planned | DeFi ecosystem |
| **Ethereum** | Research | Mainnet fees high |

---

## 5. Tech Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Server** | Next.js 14 (App Router) | REST API + server-side rendering |
| **Blockchain** | Viem + @celo/identity | On-chain interactions |
| **Database** | Redis (Upstash) | Verification state, caching |
| **Storage** | IPFS (Pinata) | Encrypted proof documents |
| **Payments** | cUSD (Celo) | Stablecoin payments |
| **Frontend** | React + Tailwind | User verification flow |
| **Verification** | Self Protocol SDK | Identity verification |

---

## 6. Security Considerations

### 6.1 Data Privacy

| Data Type | Storage | Encryption |
|-----------|---------|------------|
| PII (documents) | Self Protocol (never gateway) | N/A |
| ZK Proofs | Redis (session-scoped) | AES-256 |
| Attestation Hash | On-chain | N/A (public) |
| Agent API Keys | Environment | Encrypted at rest |

### 6.2 Key Security Measures

1. **Issuer key security:** Hardware wallet recommended for mainnet
2. **PII never stored:** Only attestation hash on-chain
3. **Rate limiting:** Per-agent limits to prevent abuse
4. **Payment validation:** Require payment before issuing attestation
5. **Webhook signatures:** Verify callback authenticity
6. **Input validation:** Sanitize all user inputs

### 6.3 Compliance

- **KYC records:** Retain for FINTRAC requirement (5 years)
- **Travel Rule:** Support for $1,000 threshold
- **Audit logging:** All verification requests logged

---

## 7. API Reference

### 7.1 Request Verification

**Endpoint:** `POST /api/verification/request`

**Request:**
```json
{
  "agentAddress": "0x...",
  "userAddress": "0x...",
  "level": "standard",
  "callbackUrl": "https://agent.example/webhook",
  "referenceId": "agent-internal-id-123"
}
```

**Response:**
```json
{
  "verificationId": "uuid-v4",
  "verificationUrl": "https://self.protocol/verify/abc123",
  "expiresAt": "2026-03-15T00:00:00Z",
  "fee": "1.50",
  "currency": "cUSD"
}
```

### 7.2 Check Status

**Endpoint:** `GET /api/verification/:id/status`

**Response:**
```json
{
  "verificationId": "uuid-v4",
  "status": "completed",
  "level": "standard",
  "attestationHash": "0xabc123...",
  "issuedAt": "2026-03-14T22:00:00Z",
  "expiresAt": "2026-06-14T22:00:00Z"
}
```

### 7.3 Query Attestation

**Endpoint:** `GET /api/attestation/:address`

**Response:**
```json
{
  "address": "0x...",
  "verified": true,
  "level": "standard",
  "country": "CA",
  "ageVerified": true,
  "issuer": "0xGATEWAY_ADDRESS",
  "issuedAt": "2026-03-14T22:00:00Z",
  "expiresAt": "2026-06-14T22:00:00Z"
}
```

---

## 8. Environment Variables

```bash
# Celo
CELO_ALFAJORES_RPC=https://alfajores-forno.celo-testnet.org
CELO_MAINNET_RPC=https://forno.celo.org

# Keys
ISSUER_PRIVATE_KEY=0x...
ODIS_PAYMENTS_ADDRESS=0x645170cdB6B5c1bc80847bb728dBa56C50a20a49

# Contracts (Alfajores)
FEDERATED_ATTESTATIONS=0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3
STABLE_TOKEN=0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1

# Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# IPFS
PINATA_JWT=...
PINATA_GATEWAY=https://gateway.pinata.cloud

# Self Protocol
SELF_API_KEY=...
SELF_PROJECT_ID=...

# App
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
WEBHOOK_SECRET=...
```

---

## 9. Implementation Phases

### Phase 1: MVP (Hackathon)
**Deadline:** March 18, 2026

- [x] Next.js project setup
- [ ] Issuer wallet setup (Alfajores)
- [ ] Self Protocol integration (basic)
- [ ] API: verification request endpoint
- [ ] API: status check endpoint
- [ ] API: attestation lookup
- [ ] On-chain attestation registration
- [ ] End-to-end demo flow

### Phase 2: Production
**Timeline:** Q2 2026

- [ ] Enhanced verification (ID + biometric)
- [ ] x402 payment integration
- [ ] Credential caching (90-day validity)
- [ ] Webhook notifications
- [ ] Rate limiting & abuse prevention
- [ ] Mainnet deployment

### Phase 3: Scale
**Timeline:** Q3-Q4 2026

- [ ] Multi-chain expansion (Base, Arbitrum)
- [ ] ERC-8004 agent identity
- [ ] Subscription plans
- [ ] Analytics dashboard
- [ ] Partner integrations (Blockpass, Sumsub)

---

## 10. Success Metrics (Hackathon)

| Metric | Target |
|--------|--------|
| Agent can request verification | ✅ |
| User completes phone verification | ✅ |
| Attestation registered on Alfajores | ✅ |
| Agent can query attestation | ✅ |
| Demo flow works end-to-end | ✅ |
| Documentation complete | ✅ |

---

## 11. Regulatory Compliance

### 11.1 Jurisdictional Approach

| Jurisdiction | Requirements | Status |
|--------------|--------------|--------|
| **Canada** | FINTRAC MSB registration, CAD 1,000 Travel Rule | Research complete |
| **US** | FinCEN MSB registration, state MTLs | Research complete |
| **EU** | MiCA (July 2026 deadline), AMLA | Research complete |

### 11.2 Compliance Architecture

- **Self Protocol:** Handles identity verification (PII)
- **Gateway:** Stores only attestation hashes
- **Travel Rule:** Implemented via Notabene (future)
- **AML Screening:** Integration with Chainalysis (future)

---

## 12. Appendix

### 12.1 Key Resources

- **Self Protocol Docs:** docs.self.xyz
- **Celo Identity:** docs.celo.org/what-is-celo/about-celo-l1/protocol/identity
- **Celo L2:** docs.celo.org/build#celo-l2-mainnet
- **Federated Attestations:** docs.celo.org/protocol/identity/federated-attestations

### 12.2 Contract Addresses (Alfajores)

| Contract | Address |
|----------|---------|
| FederatedAttestations | `0x70F9314aF173c246669cFb0EEe79F9Cfd9C34ee3` |
| StableToken (cUSD) | `0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1` |
| ODIS Payments | `0x645170cdB6B5c1bc80847bb728dBa56C50a20a49` |

### 12.3 External Links

- **CeloScan:** https://alfajores.celoscan.io
- **Celo Faucet:** https://faucet.celo.org
- **Self Protocol:** https://self.xyz

---

*Specification approved for Celo Hackathon implementation.*
