/**
 * Starter Tier Provider — No Documents Required
 *
 * Designed for financial inclusion: serves the 1.4B unbanked who may lack
 * government-issued IDs but have mobile phones and social presence.
 *
 * Sources:
 * - Phone number uniqueness (Celo's mobile-first identity layer)
 * - Human Passport stamps (social attestations: GitHub, Twitter, Discord, etc.)
 * - Community vouching signals
 *
 * Appropriate for: micro-lending, small remittances (<$200), basic access gating.
 * NOT appropriate for: AML-regulated transfers, age-restricted goods, high-value DeFi.
 *
 * Demo mode always active (no API key required for Starter).
 */

import type { ProviderResult, ProviderCheck } from "./index";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PhoneProofResult {
  verified: boolean;
  countryCode?: string;
  isUnique: boolean;
}

interface SocialStampsResult {
  score: number;
  stampCount: number;
  stamps: string[];
  classification: "human" | "likely_human" | "suspicious";
}

/**
 * Check phone number uniqueness via Celo's identity layer or HP Phone verification.
 * Demo mode: always returns verified for demonstration.
 */
async function checkPhoneUniqueness(_address: string): Promise<PhoneProofResult> {
  // Demo mode — in production would query Celo FederatedAttestations
  // or Human Passport Phone verification (id.human.tech/phone)
  await sleep(400 + Math.random() * 200);
  return {
    verified: true,
    countryCode: "KE", // demo: Kenya, fitting for Celo's focus market
    isUnique: true,
  };
}

/**
 * Check social stamps — aggregated from HP Stamps API.
 * Low-friction: no documents, just existing web2/web3 presence.
 */
async function checkSocialStamps(address: string): Promise<SocialStampsResult> {
  await sleep(500 + Math.random() * 300);

  // Demo mode — seed from address for consistent results
  const seed = parseInt(address.slice(-4), 16) % 100;
  const score = Math.min(35, Math.max(5, (seed % 30) + 5));
  const stamps = ["twitter", "discord", "github", "google", "lens"]
    .slice(0, Math.floor(score / 6));

  return {
    score,
    stampCount: stamps.length,
    stamps,
    classification: score > 20 ? "likely_human" : score > 10 ? "suspicious" : "suspicious",
  };
}

/**
 * Run Starter tier verification — phone + social proof only.
 * No passport, no document upload, no liveness check required.
 */
export async function verifyWithStarter(
  _level: string,
  userAddress: string
): Promise<ProviderResult> {
  const start = Date.now();
  const checks: ProviderCheck[] = [];

  const [phoneResult, socialResult] = await Promise.all([
    checkPhoneUniqueness(userAddress),
    checkSocialStamps(userAddress),
  ]);

  checks.push({
    type: "humanity",
    passed: phoneResult.verified && phoneResult.isUnique,
    details: phoneResult.verified
      ? `Unique phone number verified${phoneResult.countryCode ? ` (${phoneResult.countryCode})` : ""}`
      : "Phone verification failed",
    confidence: phoneResult.isUnique ? 60 : 0,
  });

  checks.push({
    type: "sybil-score",
    passed: socialResult.score > 5,
    details: `Social proof score: ${socialResult.score}/35 — ${socialResult.stampCount} stamps (${socialResult.stamps.join(", ") || "none"})`,
    confidence: socialResult.score,
  });

  const allPassed = checks.every((c) => c.passed);

  return {
    provider: "human-passport",
    success: allPassed,
    checks,
    score: Math.round((phoneResult.isUnique ? 40 : 0) + socialResult.score),
    attestationData: {
      phoneVerified: phoneResult.verified,
      phoneCountry: phoneResult.countryCode,
      socialScore: socialResult.score,
      stamps: socialResult.stamps,
      tier: "starter",
      note: "Starter tier: no document required — designed for financial inclusion",
    },
    demoMode: true, // Starter is always demo until phone verification API is wired
    durationMs: Date.now() - start,
  };
}
