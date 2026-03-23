/**
 * Venice AI — Private Cognition Engine for Identity Verification
 *
 * Venice is NOT a bolt-on risk check. It is the core reasoning layer that
 * processes ALL verification signals and makes the final trust decision.
 *
 * Why Venice:
 * - Zero data retention: verification signals are processed and forgotten
 * - No PII ever reaches an LLM that stores data
 * - The privacy guarantee is structural, not policy-based
 *
 * Flow:
 * 1. Providers (Self, Didit, Human Passport) return raw signals
 * 2. Venice receives ALL signals + context (anonymized)
 * 3. Venice reasons over them holistically — catches patterns hard-coded logic can't
 * 4. Venice returns: verdict, confidence, reasoning, flags
 * 5. KYH uses Venice's decision to issue or deny the credential
 */

const VENICE_API_KEY = process.env.VENICE_API_KEY;
const VENICE_BASE_URL = "https://api.venice.ai/api/v1";
const VENICE_MODEL = "llama-3.3-70b";

export function isVeniceConfigured(): boolean {
  return !!VENICE_API_KEY;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProviderSignal {
  provider: string;
  success: boolean;
  score?: number;
  checks: string[];
  flags?: string[];
  durationMs: number;
  demoMode?: boolean;
}

export interface VeniceVerdict {
  /** Whether to issue the credential */
  approve: boolean;
  /** 0-100 confidence in the decision */
  confidence: number;
  /** Overall trust score for the attestation (0-255, maps to EAS assuranceLevel) */
  assuranceLevel: number;
  /** Human-readable reasoning */
  reasoning: string;
  /** Risk flags (e.g. "new_wallet", "velocity_anomaly", "score_mismatch") */
  flags: string[];
  /** Cross-provider insights Venice found */
  insights: string[];
  /** Venice processed this with zero data retention */
  private: true;
  /** Processing time */
  durationMs: number;
  /** Whether Venice was actually used or we fell back */
  engine: "venice" | "fallback";
}

export interface VerificationContext {
  tier: string;
  walletAddress: string; // anonymized to first/last 4 chars in the prompt
  agentAddress: string;  // anonymized
  providerSignals: ProviderSignal[];
  metadata?: {
    walletAgeDays?: number;
    transactionCount?: number;
    previousVerifications?: number;
    requestTimestamp?: string;
  };
}

// ─── Core Reasoning Engine ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the verification reasoning engine for Know Your Human (KYH), an identity verification gateway. Your role is to analyze signals from multiple identity providers and make a trust decision.

You receive:
- The verification tier requested (reputation, document, biometric, fullkyc)
- Raw signals from each provider (scores, checks passed/failed, flags)
- Contextual metadata (anonymized — you never see actual PII)

You must return a JSON object with these exact fields:
{
  "approve": boolean,        // true = issue credential, false = deny
  "confidence": number,      // 0-100, how confident you are in your decision
  "assuranceLevel": number,  // 0-255, maps to EAS attestation confidence
  "reasoning": string,       // 2-3 sentences explaining your decision
  "flags": string[],         // risk flags you identified
  "insights": string[]       // cross-provider patterns or notable observations
}

Decision framework:
- REPUTATION tier: approve if reputation score > 25/100. Low bar — this is sybil resistance, not identity proof.
- DOCUMENT tier: approve if passport ZK proof validates. One strong signal is enough.
- BIOMETRIC tier: approve if BOTH liveness passes AND document validates. Two independent signals must agree.
- FULLKYC tier: approve only if passport + biometric + AML all pass. All three must agree. Any AML flag = automatic deny.

Cross-provider analysis (what hard-coded logic CANNOT do):
- If liveness passes but reputation is near-zero → flag as suspicious (real person but brand new to crypto)
- If document validates but biometric score is borderline → flag for human review
- If all providers pass but response times are unusually fast → flag potential replay attack
- If reputation is very high but document check fails → flag potential identity borrowing
- If any provider returns in <100ms → likely a test/mock, note this

Assurance level guide:
- 0-50: Low confidence, marginal pass
- 51-150: Standard confidence
- 151-200: High confidence, multiple strong signals
- 201-255: Very high confidence, all providers agree strongly

Be conservative. False negatives (denying a real human) are better than false positives (approving a bot or stolen identity). When in doubt, deny and explain why.

Return ONLY the JSON object. No markdown, no explanation outside the JSON.`;

/**
 * The main reasoning function. Takes all provider signals and returns
 * a holistic verdict.
 */
export async function reasonOverVerification(
  context: VerificationContext
): Promise<VeniceVerdict> {
  const start = Date.now();

  if (!VENICE_API_KEY) {
    return fallbackReasoning(context, start);
  }

  // Anonymize wallet addresses for the prompt
  const anonWallet = `${context.walletAddress.slice(0, 6)}...${context.walletAddress.slice(-4)}`;
  const anonAgent = `${context.agentAddress.slice(0, 6)}...${context.agentAddress.slice(-4)}`;

  const userMessage = JSON.stringify({
    tier: context.tier,
    wallet: anonWallet,
    agent: anonAgent,
    providerSignals: context.providerSignals.map(s => ({
      provider: s.provider,
      success: s.success,
      score: s.score,
      checks: s.checks,
      flags: s.flags || [],
      responseTimeMs: s.durationMs,
      demoMode: s.demoMode || false,
    })),
    metadata: context.metadata || {},
    requestedAt: new Date().toISOString(),
  });

  try {
    const response = await fetch(`${VENICE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VENICE_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.1, // Low temp for deterministic decisions
        max_tokens: 800,
        venice_parameters: {
          include_venice_system_prompt: false,
        },
      }),
    });

    if (!response.ok) {
      console.error(`Venice API error: ${response.status} ${response.statusText}`);
      return fallbackReasoning(context, start);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("Venice returned empty content");
      return fallbackReasoning(context, start);
    }

    // Parse JSON from Venice response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Venice response not valid JSON:", content.slice(0, 200));
      return fallbackReasoning(context, start);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const durationMs = Date.now() - start;

    return {
      approve: Boolean(parsed.approve),
      confidence: clamp(parsed.confidence || 0, 0, 100),
      assuranceLevel: clamp(parsed.assuranceLevel || 0, 0, 255),
      reasoning: String(parsed.reasoning || "No reasoning provided."),
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      private: true,
      durationMs,
      engine: "venice",
    };
  } catch (error) {
    console.error("Venice reasoning error:", error);
    return fallbackReasoning(context, start);
  }
}

// ─── Fallback Logic ──────────────────────────────────────────────────────────

/**
 * Deterministic fallback when Venice is unavailable.
 * Uses simple threshold logic — the thing Venice replaces.
 */
function fallbackReasoning(
  context: VerificationContext,
  startTime: number
): VeniceVerdict {
  const signals = context.providerSignals;
  const allPassed = signals.every(s => s.success);
  const anyPassed = signals.some(s => s.success);
  const avgScore = signals.reduce((sum, s) => sum + (s.score || 0), 0) / (signals.length || 1);

  let approve = false;
  let assuranceLevel = 0;
  let reasoning = "";

  switch (context.tier) {
    case "reputation":
      approve = anyPassed && avgScore > 25;
      assuranceLevel = approve ? Math.min(Math.round(avgScore * 1.5), 100) : 0;
      reasoning = approve
        ? `Reputation check passed with score ${avgScore.toFixed(0)}. Basic sybil resistance met.`
        : `Reputation score ${avgScore.toFixed(0)} below threshold.`;
      break;

    case "document":
      approve = anyPassed;
      assuranceLevel = approve ? 120 : 0;
      reasoning = approve
        ? "ZK passport proof validated."
        : "Passport verification failed.";
      break;

    case "biometric":
      approve = allPassed;
      assuranceLevel = approve ? 180 : 0;
      reasoning = approve
        ? "Both liveness and document verification passed."
        : "One or more biometric checks failed.";
      break;

    case "fullkyc":
      approve = allPassed;
      assuranceLevel = approve ? 220 : 0;
      reasoning = approve
        ? "All verification layers passed: passport, biometric, AML."
        : "Full KYC requires all checks to pass.";
      break;

    default:
      reasoning = "Unknown tier.";
  }

  return {
    approve,
    confidence: approve ? 70 : 80,
    assuranceLevel,
    reasoning: `[FALLBACK] ${reasoning} Venice was unavailable — using deterministic logic.`,
    flags: ["venice_unavailable"],
    insights: [],
    private: true,
    durationMs: Date.now() - startTime,
    engine: "fallback",
  };
}

// ─── Privacy Attestation ─────────────────────────────────────────────────────

/**
 * Returns metadata about Venice's privacy guarantees for API responses.
 */
export function getPrivacyAttestation() {
  return {
    engine: "Venice AI",
    model: VENICE_MODEL,
    dataRetention: "none",
    privacyGuarantee:
      "All verification reasoning is performed by Venice AI with zero data retention. " +
      "Provider signals are anonymized before processing. No PII is sent to or stored by any LLM. " +
      "Venice processes the signals and immediately discards them.",
    configured: isVeniceConfigured(),
    fallbackAvailable: true,
    url: "https://venice.ai",
  };
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
