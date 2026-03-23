/**
 * Multi-Provider Verification with Venice Reasoning Engine
 *
 * Architecture:
 * 1. Providers (Self, Didit, Human Passport) gather raw verification signals
 * 2. Venice AI processes ALL signals holistically and makes the trust decision
 * 3. Venice's verdict determines whether the credential is issued
 *
 * Venice replaces hard-coded if/else scoring with contextual reasoning.
 * It catches cross-provider patterns that threshold logic cannot:
 * - High reputation but failed document → possible identity borrowing
 * - Fast response times across all providers → possible replay attack
 * - Liveness pass but zero on-chain history → real but new user (flag, don't deny)
 *
 * If Venice is unavailable, deterministic fallback logic kicks in.
 */

import { verifySelf } from "./self";
import { verifyWithDidit } from "./didit";
import { verifyWithHumanPassport } from "./human-passport";
import { verifyWithStarter } from "./starter";
import {
  reasonOverVerification,
  type ProviderSignal,
  type VeniceVerdict,
} from "../venice";

export interface ProviderCheck {
  type:
    | "humanity"
    | "document"
    | "liveness"
    | "face-match"
    | "aml"
    | "sybil-score"
    | "sanctions"
    | "age"
    | "nationality"
    | "phone";
  passed: boolean;
  details?: string;
  confidence?: number;
}

export interface ProviderResult {
  provider: "self" | "didit" | "human-passport";
  success: boolean;
  checks: ProviderCheck[];
  score?: number;
  attestationData?: Record<string, unknown>;
  demoMode: boolean;
  durationMs: number;
}

export interface VerificationPlan {
  level: string;
  providers: Array<"self" | "didit" | "human-passport" | "starter">;
  checks: string[];
  estimatedCostUSD: string;
  estimatedTimeSeconds: number;
}

export interface MultiProviderResult {
  level: string;
  overallSuccess: boolean;
  providerResults: ProviderResult[];
  totalChecks: number;
  passedChecks: number;
  demoMode: boolean;
  durationMs: number;
  /** Venice reasoning verdict — the core decision engine */
  veniceVerdict?: VeniceVerdict;
}

/**
 * Get the verification plan for a given tier.
 */
export function getVerificationPlan(level: string): VerificationPlan {
  switch (level) {
    case "reputation":
    case "starter":
      return {
        level,
        providers: ["human-passport"],
        checks: ["onchain-activity", "sybil-score"],
        estimatedCostUSD: "0",
        estimatedTimeSeconds: 2,
      };
    case "document":
    case "basic":
      return {
        level,
        providers: ["self"],
        checks: ["passport-nfc", "zk-proof", "age", "nationality"],
        estimatedCostUSD: "0.01",
        estimatedTimeSeconds: 3,
      };
    case "biometric":
    case "standard":
      return {
        level,
        providers: ["didit"],
        checks: ["document-scan", "liveness", "face-match", "ip-analysis"],
        estimatedCostUSD: "0.25",
        estimatedTimeSeconds: 8,
      };
    case "fullkyc":
    case "enhanced":
      return {
        level,
        providers: ["self", "didit"],
        checks: [
          "passport-nfc",
          "zk-proof",
          "document-scan",
          "liveness",
          "face-match",
          "aml-screening",
          "sanctions-check",
          "ip-analysis",
        ],
        estimatedCostUSD: "0.75",
        estimatedTimeSeconds: 12,
      };
    default:
      return {
        level,
        providers: [],
        checks: [],
        estimatedCostUSD: "0",
        estimatedTimeSeconds: 0,
      };
  }
}

/**
 * Execute multi-provider verification for a given tier.
 *
 * Step 1: Gather raw signals from providers
 * Step 2: Send ALL signals to Venice for holistic reasoning
 * Step 3: Venice's verdict determines overallSuccess
 */
export async function executeVerification(
  level: string,
  userData: {
    userAddress: string;
    agentAddress: string;
    agentId?: number;
  }
): Promise<MultiProviderResult> {
  const start = Date.now();
  const results: ProviderResult[] = [];

  // ── Step 1: Gather raw signals from providers ──────────────────────────

  if (level === "reputation" || level === "starter") {
    const hpResult = await verifyWithHumanPassport(level, userData.userAddress);
    results.push(hpResult);
  } else if (level === "document" || level === "basic") {
    const selfResult = await verifySelf(level, userData.userAddress);
    results.push(selfResult);
  } else if (level === "biometric" || level === "standard") {
    const diditResult = await verifyWithDidit(level, userData.userAddress);
    results.push(diditResult);
  } else if (level === "fullkyc" || level === "enhanced") {
    const [selfResult, diditResult] = await Promise.all([
      verifySelf(level, userData.userAddress),
      verifyWithDidit(level, userData.userAddress),
    ]);
    results.push(selfResult, diditResult);
  }

  // ── Step 2: Convert to Venice signal format ────────────────────────────

  const providerSignals: ProviderSignal[] = results.map((r) => ({
    provider: r.provider,
    success: r.success,
    score: r.score,
    checks: r.checks.map((c) => `${c.type}:${c.passed ? "pass" : "fail"}`),
    flags: r.checks.filter((c) => !c.passed).map((c) => `${c.type}_failed`),
    durationMs: r.durationMs,
    demoMode: r.demoMode,
  }));

  // ── Step 3: Venice makes the decision ──────────────────────────────────

  const veniceVerdict = await reasonOverVerification({
    tier: level,
    walletAddress: userData.userAddress,
    agentAddress: userData.agentAddress,
    providerSignals,
    metadata: {
      requestTimestamp: new Date().toISOString(),
    },
  });

  // ── Step 4: Aggregate ──────────────────────────────────────────────────

  const allChecks = results.flatMap((r) => r.checks);
  const passedChecks = allChecks.filter((c) => c.passed).length;
  const demoMode = results.some((r) => r.demoMode);

  // Venice's verdict is the source of truth for overallSuccess
  const overallSuccess = veniceVerdict.approve;

  return {
    level,
    overallSuccess,
    providerResults: results,
    totalChecks: allChecks.length,
    passedChecks,
    demoMode,
    durationMs: Date.now() - start,
    veniceVerdict,
  };
}
