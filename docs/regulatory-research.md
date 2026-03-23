# KYC/AML Regulatory Research for Celo Blockchain Gateway Service

**Research Date:** March 2026  
**Purpose:** Regulatory landscape analysis for building a crypto onramp/gateway service on Celo blockchain

---

## Executive Summary

Building a crypto gateway service on Celo requires navigating a complex and evolving regulatory environment across Canada, the US, and EU. All three jurisdictions require KYC/AML compliance, with the EU's MiCA regulation entering full application by July 2026. The key compliance frameworks include FATF's Travel Rule, with varying thresholds across jurisdictions. Celo has native identity infrastructure through Self Protocol that offers privacy-preserving verification options.

---

## 1. KYC Requirements for Crypto Onramps by Jurisdiction

### 1.1 Canada

**Regulatory Body:** FINTRAC (Financial Transactions and Reports Analysis Centre of Canada)

**Key Requirements:**
- **Registration:** Must register as a Money Services Business (MSB) with FINTRAC
- **Compliance Program:** Must develop, implement, and maintain a comprehensive AML/CTF program including:
  - Appoint a compliance officer
  - Conduct risk assessments
  - Implement KYC procedures
  - Monitor transactions
  - Report to FINTRAC

**KYC Requirements:**
- Verify identity of customers
- Assess risk profile
- Monitor transactions
- Store records for 5 years

**Travel Rule Threshold:** CAD 1,000

**Notable:** As of April 2025, public crypto asset funds can only invest in Bitcoin and Ethereum, must use regulated custodians, and cannot hold more than 10% of assets in crypto. OSFI regulates banks and requires them to verify source of clients' cryptocurrency funds and work only with FINTRAC-registered companies.

---

### 1.2 United States

**Regulatory Bodies:** FinCEN (primary), SEC, CFTC, and state regulators

**Key Requirements:**
- **MSB Registration:** Most crypto firms must register as Money Services Businesses with FinCEN
- **State Licenses:** Many states require Money Transmitter Licenses (MTL) - costs range from $5,000-$150,000 per state
- **New York:** BitLicense required (up to $500,000 in fees)
- **BSA Compliance:** Must comply with Bank Secrecy Act requirements

**AML Program Requirements (FinCEN):**
- Written AML policies
- Appointed Compliance Officer
- Independent audits
- Ongoing employee training
- Risk-based customer monitoring
- SAR (Suspicious Activity Report) and CTR (Currency Transaction Report) filings

**Upcoming Changes:**
- From 2026, investment advisors will be required to implement AML systems
- The absence of a dedicated federal regulator creates a complex patchwork

---

### 1.3 European Union

**Primary Regulation:** MiCA (Markets in Crypto-Assets Regulation)

**Key Timeline:**
- Grandfathering period ends: **July 1, 2026**
- All CASPs must be fully authorized by this date
- No further grace periods beyond national transitional deadlines

**CASP Authorization Requirements:**
- Capital adequacy requirements
- Segregation of customer assets from company funds
- Stringent data protection measures
- Thorough AML/KYC procedures
- Whitepaper publication for crypto-assets

**AMLA (Anti-Money Laundering Authority):**
- New EU AML Regulation and centralized AMLA complement MiCA
- Harmonizes KYC/AML obligations across member states
- By July 10, 2026, AMLA must issue guidelines on ongoing monitoring

---

## 2. Compliance Frameworks

### 2.1 FATF Travel Rule

**What It Is:** The Financial Action Task Force's Travel Rule requires VASPs (Virtual Asset Service Providers) to collect and transmit originator/beneficiary information for crypto transfers.

**Applicability:** Applies to:
- Crypto-fiat exchange
- Crypto-crypto exchange
- Transfer of cryptocurrency
- Custodian wallet providers
- Financial services related to VA issuance

**Threshold:** FATF recommends **$1,000/€1,000 de minimis limit**

**Information Required (for transfers above threshold):**
- Name of the originator
- Blockchain address of the originator
- Identity of the originator's VASP
- Originator's identification number (National ID, etc.)
- Beneficiary's name
- Beneficiary's VASP identity

**2025-2026 Updates:**
- FATF continues monitoring jurisdictions for implementation
- Focus on peer-to-peer transfers and unhosted wallets
- Emphasis on information sharing between VASPs

### 2.2 FATF Guidelines Summary

The FATF Recommendations (updated 2025) form the basis for global AML/CTF standards:
- Customer due diligence (CDD)
- Record keeping
- Suspicious transaction reporting
- Sanctions compliance
- Cross-border cooperation

**Jurisdictional Implementation:** Varies significantly - some countries have fully implemented, others have partial or no implementation.

---

## 3. Existing KYC Solutions on Celo

### 3.1 Self Protocol (Primary Solution)

**Overview:** Self is a leading digital identity infrastructure for Web2 and Web3, integrated natively with Celo.

**Key Features:**
- Zero-knowledge proofs (zkPoH - Zero-Knowledge Proof of Humanity)
- Biometric passport verification
- Privacy-preserving identity verification
- Designed for the agentic web - allows AI agents to act on users' behalf without compromising personal data

**Integration Points:**
- Celo Identity Verification Tool for blockchain submissions
- Celonames integration for verified human users
- Aave integration for verified users (enhanced yields)
- zkPoH confirms wallet belongs to a single person while keeping data private

**Security:** Audited by ZKSecurity with focus on cryptographic primitives and smart contracts

**Documentation:** Available at docs.celo.org/build-on-celo/build-with-self

### 3.2 Other Celo Identity Features

- **Phone Number Verification:** Off-chain SMS verification built into Celo protocol
- **CeloNames:** Human-readable identities with built-in verification via Self Protocol

---

## 4. Regulatory Landscape for Identity Verification on Blockchain

### 4.1 Global Trends

**Decentralized Identity (DID):**
- Growing adoption of W3C DID standards
- Verifiable Credentials (VC) model gaining traction
- EU Digital Identity (EUDI) Wallet framework (Regulation EU 2024/1183)

**Blockchain vs. Privacy:**
- Tension between blockchain immutability and GDPR "right to be forgotten"
- Zero-knowledge proofs increasingly used to balance compliance with privacy
- Credential data typically NOT stored on-chain - only verification hashes

### 4.2 Regulatory Considerations

**On-Chain Identity:**
- Blockchain stores verification hashes, not PII
- Public keys stored for credential verification
- Privacy-preserving approaches are regulatory-friendly

**Real-Time Compliance:**
- Integration with regulatory data sources (sanctions lists, PEP lists)
- Real-time verification status updates possible via oracles
- GLEIF + Chainlink partnerships for LEI data on-chain

### 4.3 Challenges

- **Accountability:** No single entity responsible in decentralized systems
- **Cross-Border:** Different regulations in different jurisdictions
- **Data Retention:** GDPR vs. blockchain immutability conflict
- **Verification Standards:** Lack of universal assurance levels

---

## 5. Recommendations for Building a Celo Gateway Service

### 5.1 Minimum Compliance Stack

| Component | Recommendation |
|-----------|---------------|
| Identity Verification | Integrate Self Protocol for on-chain verification |
| KYC Provider | Use established provider (Sumsub, Stripe Identity, etc.) for off-chain verification |
| Travel Rule | Implement Notabene or similar Travel Rule solution |
| AML Screening | Integrate Chainalysis or Elliptic for sanctions/PEP screening |
| Transaction Monitoring | Build or integrate real-time monitoring system |

### 5.2 Jurisdictional Approach

**For Canada:**
- Register with FINTRAC as MSB
- Implement CAD 1,000 Travel Rule threshold
- Follow PCMLTFA requirements

**For US:**
- Register with FinCEN as MSB
- Obtain necessary state MTLs based on target markets
- Consider NY BitLicense if operating in New York

**For EU:**
- Prepare for MiCA full application by July 2026
- Apply for CASP authorization
- Comply with AMLA requirements

### 5.3 Technical Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  User Wallet    │────▶│  Celo Gateway   │────▶│  Self Protocol  │
│  (on Celo)      │     │  Service        │     │  (Identity)     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
            ┌───────────┐ ┌───────────┐ ┌───────────┐
            │  KYC/AML  │ │ Travel    │ │ Transaction│
            │ Provider  │ │ Rule API  │ │ Monitor    │
            └───────────┘ └───────────┘ └───────────┘
```

---

## 6. Key Resources

- **Celo Docs - Self:** docs.celo.org/build-on-celo/build-with-self
- **FINTRAC Guidance:** fintrac-canafe. gc.ca/eng/pages/vc/vc.aspx
- **FinCEN MSB Registration:** finsen.gov/msb
- **MiCA/ESMA:** esma.europa.eu/esmas-activities/digital-finance-and-innovation/markets-crypto-assets-regulation-mica
- **FATF Virtual Assets:** fatf-gafi.org/en/publications/Fatfrecommendations/targeted-update-virtual-assets-vasps-2025.html

---

## 7. Conclusion

The regulatory landscape for crypto onramps is complex but navigable. Celo's native Self Protocol provides a privacy-preserving identity verification solution that aligns well with emerging regulatory expectations around zero-knowledge proofs. Key deadlines to watch:

- **July 2026:** MiCA full application in EU
- **Ongoing:** FATF Travel Rule enforcement strengthening globally

A compliant Celo gateway service should integrate Self for identity verification, implement robust Travel Rule compliance, and maintain flexible architecture to adapt to evolving jurisdictional requirements.

---

*This research provides a starting point for regulatory planning. Legal counsel should be consulted for specific jurisdiction compliance strategies.*
