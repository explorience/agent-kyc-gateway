# Technical Research: KYC Approaches on Celo Blockchain

**Project:** Celo KYC Gateway  
**Date:** March 2025  
**Purpose:** Technical landscape analysis for implementing identity verification on Celo

---

## Executive Summary

This report examines the technical landscape for implementing KYC (Know Your Customer) on Celo, including identity protocols, gas costs, and chain-specific approaches. Key findings:

- **Celo is now an Ethereum L2** (as of March 26, 2025) — this significantly impacts identity implementation options
- **Self Protocol** launched February 2025 provides native ZK-based identity on Celo
- **Gas costs remain extremely low** (fractions of a cent) — favorable for identity transactions
- **Existing phone number mapping** provides unique Celo-specific identity infrastructure

---

## 1. How Other Chains Handle KYC

### 1.1 Polygon

**Approach:** Polygon ID — zero-knowledge (ZK) proof-based decentralized identity

Polygon ID is the most mature ZK-based identity solution in the space. Key characteristics:

- **Technology:** Built on the iden3 protocol, uses Circom ZK circuits
- **Architecture:**
  - Issuers: Trusted entities that credentialize user attributes (e.g., KYC providers)
  - Holders: Users who receive and store credentials in a wallet
  - Verifiers: DApps that request proofs without seeing raw data
  
- **KYC Implementation:**
  - KYC providers issue short-lived credentials
  - Users prove KYC status via ZK proofs without revealing actual documents
  - Supports dynamic credentials (v6 release) — credentials can be updated/revoked
  - AML checks can be performed on each credential refresh

- **On-chain Verification:** zkProof Request Language (ZK-QRL) for specifying required private attributes

**References:**
- https://polygon.technology/blog/introducing-polygon-id-zero-knowledge-own-your-identity-for-web3
- https://blog.identity.foundation/guest-blog-polygon-id/

---

### 1.2 Solana

**Approach:** Solana Attestation Service (SAS) — decentralized identity verification

**Solana Attestation Service (SAS):**
- Launched May 2025 by Solana Foundation in partnership with Civic, Solid, Trusta Labs, and Solana.ID
- Enables verifiable credentials (KYC, accredited investor status, geographic eligibility)
- Users create unique digital identity linked to their Solana wallet
- Verified credentials stored on-chain as attestations

**Civic on Solana:**
- End-to-end identity and access management for DApps
- Keeps sensitive personal data off-chain
- Uses blockchain for cryptographic attestations only
- Supports rapid verification from humanity checks to full KYC

**Reference:**
- https://www.ccn.com/education/crypto/solana-attestation-service-sas-explained-kyc-once-access-everywhere/

---

### 1.3 Ethereum

**Approach:** Multiple competing standards — EAS, Blockpass, on-chain attestations

**Ethereum Attestation Service (EAS):**
- Base layer for making declarations and adding virtual signatures to information
- Anyone can make attestations on-chain or off-chain
- Schema-based — flexible for KYC, credentials, achievements

**Blockpass On-Chain KYC 2.0:**
- Issues on-chain attestations for users
- Creates verifiable, reusable digital identity
- No smart contract maintenance required — uses existing infrastructure

**Traditional Approaches:**
- Centralized KYC oracles (e.g., Chainalysis)
- Identity verification integrated into DeFi protocols via compliance modules

**Reference:**
- https://www.blockpass.org/onchainkyc/

---

## 2. Identity Protocols Overview

### 2.1 Polygon ID

| Aspect | Details |
|--------|---------|
| **Type** | ZK-based decentralized identity |
| **Blockchain** | Polygon (primary), extensible to Ethereum, other EVMs |
| **Credentials** | Verifiable Credentials (VCs) with ZK proofs |
| **Privacy** | Selective disclosure, data minimization |
| **KYC Support** | Yes — short-lived credentials for AML compliance |
| **Issuers** | Anyone can become an issuer (must be trusted) |
| **Architecture** | iden3 protocol — issuer/holder/verifier triangle |

**Strengths:**
- Mature ZK technology with production use
- Supports selective disclosure
- Flexible credential schemas

**Limitations:**
- Requires trusted issuers
- Integration complexity for existing KYC providers

---

### 2.2 Gitcoin Passport

| Aspect | Details |
|--------|---------|
| **Type** | Sybil-resistant identity aggregation |
| **Blockchain** | Ethereum, Optimism, Base (via EAS and Sign Protocol) |
| **Credentials** | "Stamps" — verification stamps from multiple providers |
| **Scoring** | Weighted score based on accumulated stamps |
| **Privacy** | Aggregate scoring — doesn't reveal specific credentials |
| **KYC Support** | Individual Verifications available — specific targeted proofs |

**Stamp Categories:**
1. **Blockchain/Crypto Stamps** — wallet age, ENS, NFT holdings
2. **Social Stamps** — Twitter, GitHub, Discord verification
3. **Proof-of-Personhood** — BrightID, Worldcoin
4. **Reputation Stamps** — POAP, Gitcoin contributions

**KYC Integration:**
- Individual Verifications offer specific proofs (not just aggregate)
- On-chain attestations via Sign Protocol (Optimism/Base) or SBTs (Stellar)
- Reusable KYC with zero personal data exposed

**References:**
- https://docs.passport.gitcoin.co/
- https://www.gitcoin.co/blog/gitcoin-passport-onchain-stamps

---

### 2.3 Worldcoin (now "World")

| Aspect | Details |
|--------|---------|
| **Type** | Biometric proof-of-personhood |
| **Verification** | Orb — custom hardware scanning iris/face |
| **Credentials** | World ID — proof-of-personhood credential |
| **Privacy** | Iris codes stored, not raw biometric data |
| **Global Reach** | ~7M+ verified users (as of late 2024) |
| **KYC Relevance** | Proof-of-humanity (not full KYC) |

**Architecture:**
- Orb hardware captures iris pattern → generates iris code
- Iris code hashed and stored in Merkle tree
- User receives credential proving uniqueness
- Zero-knowledge proofs enable verification without identification

**Strengths:**
- Strong proof-of-personhood (one human = one credential)
- Hardware-based — difficult to spoof

**Limitations:**
- Privacy concerns around biometric data
- Limited global coverage (requires Orb access)
- Not a full KYC solution — proves humanity, not identity documents

**Reference:**
- https://cointelegraph.com/explained/what-is-worldcoin-and-how-does-it-help-preserve-world-id

---

## 3. Celo Gas Costs for Identity Transactions

### 3.1 Current Gas Landscape

**Important:** As of block height 31,056,500 (March 26, 2025), Celo is no longer a standalone Layer 1 — it is now an Ethereum Layer 2 running on the OP Stack.

**Gas Price:**
- Current gas price minimum: ~25,000 GWei (highly variable)
- Average transaction fees: $0.01–$0.05 USD (extremely low)
- Historical fees: $0.001–$0.02 for standard transfers

**Fee Abstraction:**
- Unique feature: Users can pay gas in ERC20 tokens (cUSD, cEUR, cREAL, USDC, USDT)
- No need for users to hold native CELO for transactions
- Recommended transaction type: 123 (CIP-64 compliant)

### 3.2 Identity Transaction Cost Estimates

| Transaction Type | Estimated Gas | Estimated Cost (USD) |
|-----------------|---------------|---------------------|
| Simple attestation | ~50,000 gas | $0.01–$0.03 |
| Identity registration | ~100,000 gas | $0.02–$0.05 |
| ZK proof verification | ~200,000 gas | $0.04–$0.10 |
| Smart contract deployment | ~1,500,000 gas | $0.30–$0.75 |

**Note:** Costs are estimates based on current network conditions. Actual costs vary with gas price minimum.

**Reference:**
- https://docs.celo.org/what-is-celo/about-celo-l1/protocol/transaction/gas-pricing
- https://celoscan.io/gastracker

---

## 4. Celo-Specific Identity Projects

### 4.1 Self Protocol (NEW — February 2025)

The most significant recent development. Self Protocol launched at EthDenver 2025 following Celo Foundation's acquisition of OpenPassport.

**Components:**

**Self Pass:**
- ZK proof-of-humanity verification
- Privacy-preserving — uses electronic passport NFC + ZK proofs
- Supports 174+ countries
- One passport = one claim (Sybil-resistant)
- Age and country verification without revealing actual data

**Self Connect:**
- Transforms phone numbers into wallet addresses
- Integrates with existing Celo phone number mapping
- Enables sending assets via phone number (like Venmo)
- Currently 7M+ activated users

**Technical Implementation:**
- Zero-knowledge proofs for privacy
- Electronic passport NFC verification
- No invasive procedures required
- Decentralized protocol ready for immediate integration

**Reference:** https://docs.self.xyz

---

### 4.2 Celo's Native Phone Number Mapping

**Original Identity Layer (still functional):**

- **Decentralized mapping:** Phone numbers ↔ wallet addresses
- **Attestations contract:** Records phone number → address attestations
- **ODIS:** Oblivious Decentralized Identifier Service for privacy
- **SMS-based verification:** Validators send codes via SMS

**How it works:**
1. User requests attestation from Celo's Attestations contract
2. Validators (selected randomly) send SMS with signed code
3. User submits code to complete attestation
4. Phone number is now mapped to wallet address

**Privacy Protection:**
- ODIS obfuscates phone number → address mappings
- Prevents mass harvesting of phone numbers
- Clients query ODIS, not direct blockchain lookups

**Note:** This provides payment identity (phone → address) but NOT KYC verification. It's useful for UX but not regulatory compliance.

**Reference:**
- https://docs.celo.org/what-is-celo/about-celo-l1/protocol/identity

---

### 4.3 Elastos on Celo

- Announced June 2023 — Elastos providing decentralized identity solutions on Celo
- Web3 identity infrastructure
- Focus on sustainable finance applications

---

## 5. Technical Recommendations for Celo KYC Gateway

### 5.1 Recommended Approach: Self Protocol Integration

Given the current landscape, the recommended approach for building a KYC gateway on Celo:

1. **Primary:** Integrate Self Protocol (Self Pass)
   - ZK-based — privacy-preserving
   - Native to Celo — no cross-chain complexity
   - Supports 174+ country passports
   - Proven at scale (7M+ users)

2. **Secondary:** Support Gitcoin Passport
   - Widely adopted in ecosystem
   - Works on Base/Optimism (Celo L2 compatibility)
   - Good for Sybil resistance in airdrops

3. **Optional:** Polygon ID integration
   - If cross-chain compatibility needed
   - Strong ZK infrastructure

### 5.2 Architecture Considerations

```
┌─────────────────────────────────────────────────────────┐
│                    KYC Gateway                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Self Pass   │    │ Gitcoin      │                   │
│  │  (Primary)   │    │ Passport     │                   │
│  └──────┬───────┘    └──────┬───────┘                   │
│         │                   │                           │
│         └─────────┬─────────┘                           │
│                   ▼                                     │
│         ┌─────────────────┐                            │
│         │  Verification   │                            │
│         │    Engine       │                            │
│         └────────┬────────┘                            │
│                  ▼                                     │
│         ┌─────────────────┐                            │
│         │  On-chain       │                            │
│         │  Attestation    │                            │
│         └────────┬────────┘                            │
│                  ▼                                     │
│         ┌─────────────────┐                            │
│         │  Application    │                            │
│         │  Contracts      │                            │
│         └─────────────────┘                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Gas Cost Optimization

- Self Protocol attestations likely cost <$0.10 USD
- Design for fee abstraction — allow cUSD payment
- Batch verifications where possible
- Consider gas sponsorship for user onboarding

---

## 6. Appendix: Key Resources

### Documentation
- Self Protocol: https://docs.self.xyz
- Celo Identity (legacy): https://docs.celo.org/what-is-celo/about-celo-l1/protocol/identity
- Celo L2: https://docs.celo.org/build#celo-l2-mainnet

### Identity Protocols
- Polygon ID: https://polygon.technology/blog/introducing-polygon-id-zero-knowledge-own-your-identity-for-web3
- Gitcoin Passport: https://docs.passport.gitcoin.co/
- Worldcoin: https://worldcoin.org/

### Block Explorers
- CeloScan: https://celoscan.io
- Celo Gas Tracker: https://celoscan.io/gastracker

---

*Report compiled: March 2025*
