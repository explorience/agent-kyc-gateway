/**
 * Multi-Provider Verification Abstraction
 *
 * Routes verification requests to the appropriate providers based on tier:
 * - Basic: Self Protocol (ZK humanity) + Human Passport (sybil score)
 * - Standard: Self + Didit (ID + face match) + HP score
 * - Enhanced: Self + Didit (full KYC + AML) + HP (sanctions)
 */

import { verifySelf } from "./self";
import { verifyWithDidit } from "./didit";
import { verifyWithHumanPassport } from "./human-passport";
import { verifyWithStarter } from "./starter";

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
}

/**
 * Get the verification plan for a given tier.
 */
export function getVerificationPlan(
  level: string
): VerificationPlan {
  switch (level) {
    case "reputation":
    case "starter": // legacy alias
      return {
        level,
        providers: ["human-passport"],
        checks: ["onchain-activity", "sybil-score"],
        estimatedCostUSD: "0",
        estimatedTimeSeconds: 2,
      };
    case "document":
    case "basic": // legacy alias
      return {
        level,
        providers: ["self"],
        checks: ["passport-nfc", "zk-proof", "age", "nationality"],
        estimatedCostUSD: "0.01",
        estimatedTimeSeconds: 3,
      };
    case "biometric":
    case "standard": // legacy alias
      return {
        level,
        providers: ["didit"],
        checks: ["document-scan", "liveness", "face-match", "ip-analysis"],
        estimatedCostUSD: "0.25",
        estimatedTimeSeconds: 8,
      };
    case "fullkyc":
    case "enhanced": // legacy alias
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
  const plan = getVerificationPlan(level);
  const results: ProviderResult[] = [];

  if (level === "reputation" || level === "starter") {
    // Reputation: onchain activity scoring via Human Passport
    const hpResult = await verifyWithHumanPassport(level, userData.userAddress);
    results.push(hpResult);
  } else if (level === "document" || level === "basic") {
    // Document: Self Protocol ZK passport proof
    const selfResult = await verifySelf(level, userData.userAddress);
    results.push(selfResult);
  } else if (level === "biometric" || level === "standard") {
    // Biometric: Didit liveness + face match + ID + IP analysis
    const diditResult = await verifyWithDidit(level, userData.userAddress);
    results.push(diditResult);
  } else if (level === "fullkyc" || level === "enhanced") {
    // Full KYC: Self + Didit + AML
    const [selfResult, diditResult] = await Promise.all([
      verifySelf(level, userData.userAddress),
      verifyWithDidit(level, userData.userAddress),
    ]);
    results.push(selfResult, diditResult);
  }

  // suppress unused warning
  void plan;

  // Aggregate results
  const allChecks = results.flatMap((r) => r.checks);
  const passedChecks = allChecks.filter((c) => c.passed).length;
  const overallSuccess = results.every((r) => r.success);
  const demoMode = results.some((r) => r.demoMode);

  return {
    level,
    overallSuccess,
    providerResults: results,
    totalChecks: allChecks.length,
    passedChecks,
    demoMode,
    durationMs: Date.now() - start,
  };
}
