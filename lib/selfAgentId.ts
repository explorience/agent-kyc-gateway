/**
 * Self Agent ID integration for KYH Gateway
 *
 * Verifies that an incoming agent request is from a Self Agent ID-registered agent.
 * Verified agents get a 20% discount on all paid tiers.
 *
 * Uses the @selfxyz/agent-sdk to check on-chain registration status
 * on the Celo mainnet Self Agent ID registry.
 */

import {
  SelfAgentVerifier,
  type VerificationResult,
} from "@selfxyz/agent-sdk";

// Self Agent ID Registry on Celo mainnet
const REGISTRY_ADDRESS = "0xaC3DF9ABf80d0F5c020C06B04Cced27763355944";
const CELO_RPC = process.env.CELO_RPC || "https://forno.celo.org";

// Discount for verified agents (20%)
export const AGENT_ID_DISCOUNT = 0.2;

// Tier pricing in USD
export const TIER_PRICES: Record<string, number> = {
  reputation: 0,
  document: 0.01,
  biometric: 0.25,
  fullkyc: 0.75,
};

/**
 * Get the price for a tier, with optional Self Agent ID discount
 */
export function getTierPrice(
  tier: string,
  hasAgentId: boolean
): { price: number; discount: number; originalPrice: number } {
  const originalPrice = TIER_PRICES[tier] ?? 0;
  const discount = hasAgentId && originalPrice > 0 ? AGENT_ID_DISCOUNT : 0;
  const price = originalPrice * (1 - discount);
  return { price, discount, originalPrice };
}

// Singleton verifier instance (reused across requests)
let _verifier: SelfAgentVerifier | null = null;

function getVerifier(): SelfAgentVerifier {
  if (!_verifier) {
    _verifier = new SelfAgentVerifier({
      network: "mainnet",
      registryAddress: REGISTRY_ADDRESS,
      rpcUrl: CELO_RPC,
      requireSelfProvider: true,
      includeCredentials: false,
      maxAgentsPerHuman: 0, // no sybil limit for KYH — we're a service, not limiting agents
      maxAgeMs: 5 * 60 * 1000, // 5 min timestamp window
      cacheTtlMs: 60 * 1000, // 1 min cache
    });
  }
  return _verifier;
}

/**
 * Verify a Self Agent ID signed request.
 *
 * Returns verification result with agent details if valid,
 * or { valid: false } if the agent is not registered or signature is invalid.
 *
 * This is used to determine if a requesting agent gets the 20% discount.
 * Agents WITHOUT Self Agent ID can still use KYH — they just pay full price.
 */
export async function verifySelfAgentId(
  headers: Record<string, string | undefined>
): Promise<{
  verified: boolean;
  agentAddress?: string;
  agentId?: string;
  error?: string;
}> {
  const signature = headers["x-self-agent-signature"];
  const timestamp = headers["x-self-agent-timestamp"];

  // No Self Agent ID headers — not an error, just no discount
  if (!signature || !timestamp) {
    return { verified: false };
  }

  try {
    const verifier = getVerifier();
    const result: VerificationResult = await verifier.verify({
      signature,
      timestamp,
      method: headers["x-original-method"] || "POST",
      url: headers["x-original-url"] || "/api/verify",
      body: headers["x-original-body"],
    });

    if (result.valid) {
      return {
        verified: true,
        agentAddress: result.agentAddress,
        agentId: result.agentId?.toString(),
      };
    }

    return {
      verified: false,
      error: result.error || "Agent verification failed",
    };
  } catch (err) {
    console.error("[Self Agent ID] Verification error:", err);
    return {
      verified: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Express/Next.js API route helper: extract Self Agent ID status from request.
 *
 * Usage in a Next.js API route:
 * ```ts
 * import { checkAgentId } from "@/lib/selfAgentId";
 *
 * export async function POST(req: Request) {
 *   const agentStatus = await checkAgentId(req);
 *   const { price, discount } = getTierPrice("biometric", agentStatus.verified);
 *   // ...
 * }
 * ```
 */
export async function checkAgentId(req: Request): Promise<{
  verified: boolean;
  agentAddress?: string;
  agentId?: string;
  discount: number;
}> {
  const headers: Record<string, string | undefined> = {
    "x-self-agent-signature": req.headers.get("x-self-agent-signature") ?? undefined,
    "x-self-agent-timestamp": req.headers.get("x-self-agent-timestamp") ?? undefined,
    "x-original-method": req.method,
    "x-original-url": new URL(req.url).pathname,
  };

  // Read body for signature verification
  try {
    const body = await req.clone().text();
    if (body) {
      headers["x-original-body"] = body;
    }
  } catch {
    // No body — that's fine
  }

  const result = await verifySelfAgentId(headers);
  return {
    ...result,
    discount: result.verified ? AGENT_ID_DISCOUNT : 0,
  };
}
