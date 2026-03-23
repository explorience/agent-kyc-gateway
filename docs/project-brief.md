# Project Brief: Agent KYC Gateway

## Overview
Privacy-preserving identity verification service that AI agents can call when they need to confirm their user is a real, verified human. Agents pay a fee, users complete verification via Self Protocol, agents receive attestations (not raw PII).

## Problem
- Many financial operations require KYC
- Agents can't perform identity checks themselves
- Existing KYC is centralized, expensive, exposes PII
- No standardized way for agents to verify humans

## Solution
Gateway where:
1. Agent requests verification (configurable level: basic/standard/enhanced)
2. User completes check via Self Protocol (ID upload, selfie, etc.)
3. User receives credential
4. Gateway returns attestation to agent: "passed KYC level 2" or "verified resident of Canada"
5. Agent gets compliance, users keep privacy

## Why This Wins
- **Multi-chain potential:** Works on any EVM chain (Base, Arbitrum, Ethereum)
- **x402 payments:** Micropayment-native from day one
- **Serviceable business:** Verification fees as revenue
- **Alignment:** Privacy-preserving, not surveillance

## Tech Stack
- **Identity:** Self Protocol (zk-powered proof-of-human)
- **Payments:** x402 protocol / Celo stablecoins
- **Agent:** OpenClaw for orchestration
- **Storage:** IPFS for proof docs
- **Chain:** Deploy on Celo first, expandable

## Features
- [ ] API for agents to request verification (configurable levels)
- [ ] User-facing verification flow via Self Protocol
- [ ] Privacy-preserving attestations (status only, no PII)
- [ ] Credential caching (users don't re-verify every time)
- [ ] Fee structure in USDT per verification
- [ ] Bulk discounts for high-volume agents

## Integration Points
- Self Protocol for identity verification
- ERC-8004 for agent identity
- x402 for fee payments
- Celo Stablecoins

## Alignment with Our Work
- Extends our agent infrastructure (ACP/Virtuals)
- Uses x402 we could adopt from Celo ecosystem
- Could be offered as a skill via our agent marketplace

## Next Steps
1. Study Self Protocol integration
2. Design verification levels (basic/standard/enhanced)
3. Build API endpoint for agent requests
4. Create user verification flow
5. Deploy on Celo testnet
