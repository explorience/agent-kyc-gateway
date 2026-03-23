import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  createVerificationSession,
  isSelfConfigured,
} from "@/lib/self-protocol-v2";
import {
  issueKYHCredential,
  isEASConfigured,
  formatAttestationResponse,
} from "@/lib/eas";
import {
  generate402Header,
  verifyPayment,
  PAYMENT_TIERS,
  resolveTier,
  applyAgentIdDiscount,
  type TierLevel,
} from "@/lib/x402";
import { isRegisteredAgent } from "@/lib/erc8004";
import { checkRateLimit, getRetryAfter } from "@/lib/rate-limiter";
import { checkAgentId } from "@/lib/selfAgentId";
import {
  executeVerification,
  getVerificationPlan,
  type MultiProviderResult,
} from "@/lib/providers";
import type { Address } from "viem";
import { enrichWithENS, isENSName, resolveToAddress } from "@/lib/ens";
import { getPrivacyAttestation } from "@/lib/venice";

// In-memory store for verification requests (use Redis in production)
export const verificationRequests = new Map<
  string,
  {
    id: string;
    agentAddress: string;
    agentId?: number;
    userAddress: string;
    level: string;
    status: "pending" | "completed" | "failed";
    verificationId?: string;
    attestationHash?: string;
    selfSessionId?: string;
    paymentTxHash?: string;
    providerResults?: MultiProviderResult;
    createdAt: string;
    expiresAt: string;
  }
>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      agentAddress,
      agentId,
      userAddress,
      level: rawLevel = "document",
      tier: rawTier,
      paymentHeader,
      skipPayment,
    } = body;

    // Validate inputs
    if (!agentAddress || !userAddress) {
      return NextResponse.json(
        { error: "agentAddress and userAddress are required" },
        { status: 400 }
      );
    }

    // Resolve ENS names to addresses if needed
    let resolvedAgent = agentAddress;
    let resolvedUser = userAddress;
    let agentENS: string | undefined;
    let userENS: string | undefined;

    if (isENSName(agentAddress)) {
      const resolved = await resolveToAddress(agentAddress);
      if (!resolved) {
        return NextResponse.json(
          { error: `Could not resolve ENS name: ${agentAddress}` },
          { status: 400 }
        );
      }
      agentENS = agentAddress;
      resolvedAgent = resolved;
    }

    if (isENSName(userAddress)) {
      const resolved = await resolveToAddress(userAddress);
      if (!resolved) {
        return NextResponse.json(
          { error: `Could not resolve ENS name: ${userAddress}` },
          { status: 400 }
        );
      }
      userENS = userAddress;
      resolvedUser = resolved;
    }

    // Resolve tier name (supports both old and new names)
    const level = resolveTier(rawTier || rawLevel);
    if (!level) {
      return NextResponse.json(
        {
          error:
            "Invalid verification tier. Use: reputation, document, biometric, or fullkyc",
        },
        { status: 400 }
      );
    }

    // Check Self Agent ID for discount
    const agentIdStatus = await checkAgentId(request as unknown as Request);
    const hasAgentId = agentIdStatus.verified;

    // ERC-8004 agent identity verification (optional but recommended)
    if (agentId !== undefined) {
      try {
        const registered = await isRegisteredAgent(agentId);
        if (!registered) {
          return NextResponse.json(
            {
              error: "Unregistered agent",
              message: `Agent #${agentId} is not registered on the ERC-8004 registry. Register at https://agentscan.info/ first.`,
            },
            { status: 403 }
          );
        }
      } catch (err) {
        console.warn("ERC-8004 check failed (allowing request):", err);
        // Don't block on ERC-8004 failures — network issues shouldn't break the flow
      }
    }

    // Rate limiting
    const rateLimitResult = checkRateLimit(resolvedAgent, level);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many ${level} verification requests. Limit: ${rateLimitResult.limit}/hour.`,
          remaining: rateLimitResult.remaining,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(getRetryAfter(rateLimitResult.resetAt)),
            "X-RateLimit-Limit": String(rateLimitResult.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": rateLimitResult.resetAt.toISOString(),
          },
        }
      );
    }

    const tierConfig = PAYMENT_TIERS[level];
    const { price: adjustedPrice, discountApplied } = applyAgentIdDiscount(
      tierConfig.priceCUSD,
      hasAgentId
    );

    // x402 Payment gate
    // Reputation tier is free — skip payment
    // If no payment header and not skipping payment, return 402
    const isFree = parseFloat(adjustedPrice) === 0;
    if (!paymentHeader && !skipPayment && !isFree) {
      const resource = `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000"}/api/verification`;
      const paymentRequirements = generate402Header(level, resource, hasAgentId);

      return NextResponse.json(
        {
          error: "Payment Required",
          paymentRequired: {
            amount: adjustedPrice,
            currency: "cUSD",
            network: "celo",
            paymentRequirements,
            tier: tierConfig.level,
            description: tierConfig.description,
            selfAgentId: hasAgentId
              ? {
                  verified: true,
                  agentAddress: agentIdStatus.agentAddress,
                  discountApplied: true,
                  discountPercent: 20,
                  originalAmount: tierConfig.priceCUSD,
                }
              : {
                  verified: false,
                  message:
                    "Get 20% off with Self Agent ID. Register at https://app.ai.self.xyz/",
                },
          },
        },
        {
          status: 402,
          headers: {
            "X-Payment-Required": paymentRequirements,
          },
        }
      );
    }

    // Verify payment if provided (skip for free tiers)
    let paymentReceipt = null;
    if (paymentHeader && !isFree) {
      const paymentResult = await verifyPayment(
        paymentHeader,
        adjustedPrice,
        level,
      );
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: `Payment verification failed: ${paymentResult.error}` },
          { status: 402 }
        );
      }
      paymentReceipt = paymentResult.receipt;
    }

    // EAS mode check
    const easConfigured = isEASConfigured();
    console.log(`EAS configured: ${easConfigured}`);

    // Create verification request
    const verificationId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const requestData = {
      id: verificationId,
      agentAddress: resolvedAgent.toLowerCase(),
      agentId: agentId !== undefined ? Number(agentId) : undefined,
      userAddress: resolvedUser.toLowerCase(),
      level,
      status: "pending" as const,
      paymentTxHash: paymentReceipt?.txHash,
      createdAt: new Date().toISOString(),
      expiresAt,
    };

    verificationRequests.set(verificationId, requestData);

    // Create Self Protocol verification session
    const selfSession = await createVerificationSession(
      userAddress,
      level as TierLevel
    );

    // Store the Self session ID for webhook callbacks
    const storedRequest = verificationRequests.get(verificationId)!;
    storedRequest.selfSessionId = selfSession.sessionId;

    // Multi-provider verification
    const multiProviderResult = await executeVerification(
      level as TierLevel,
      { userAddress: resolvedUser, agentAddress: resolvedAgent, agentId: requestData.agentId }
    );
    storedRequest.providerResults = multiProviderResult;

    // Issue EAS attestation on Celo
    const providerNames = multiProviderResult.providerResults
      .map((r) => r.provider)
      .join("+");

    const easAttestation = await issueKYHCredential(
      resolvedUser,
      level as TierLevel,
      providerNames,
      !multiProviderResult.overallSuccess || multiProviderResult.demoMode
    );

    storedRequest.attestationHash = easAttestation.uid;
    storedRequest.status = multiProviderResult.overallSuccess ? "completed" : "failed";

    console.log(
      `Verification ${storedRequest.status} for ${userAddress}: ${easAttestation.uid} (demo: ${easAttestation.demoMode})`
    );

    const demoMode = easAttestation.demoMode;

    const verificationPlan = getVerificationPlan(level as TierLevel);

    // Enrich with ENS names for the response
    const [agentENSData, userENSData] = await Promise.all([
      enrichWithENS(resolvedAgent.toLowerCase()),
      enrichWithENS(resolvedUser.toLowerCase()),
    ]);

    const response = NextResponse.json({
      verificationId,
      status: storedRequest.status,
      level,
      agentId: requestData.agentId,
      expiresAt,
      identity: {
        agent: {
          address: resolvedAgent.toLowerCase(),
          ...(agentENS ? { inputENS: agentENS } : {}),
          ...(agentENSData.ensName ? { ensName: agentENSData.ensName } : {}),
          ...(agentENSData.ensAvatar ? { ensAvatar: agentENSData.ensAvatar } : {}),
        },
        user: {
          address: resolvedUser.toLowerCase(),
          ...(userENS ? { inputENS: userENS } : {}),
          ...(userENSData.ensName ? { ensName: userENSData.ensName } : {}),
          ...(userENSData.ensAvatar ? { ensAvatar: userENSData.ensAvatar } : {}),
        },
      },
      selfVerificationUrl: selfSession.verificationUrl,
      selfQrData: selfSession.qrData,
      attestationHash: storedRequest.attestationHash,
      attestation: formatAttestationResponse(easAttestation),
      paymentReceipt,
      verificationPlan: {
        providers: verificationPlan.providers,
        checks: verificationPlan.checks,
        estimatedCostUSD: verificationPlan.estimatedCostUSD,
      },
      providerResults: {
        overallSuccess: multiProviderResult.overallSuccess,
        totalChecks: multiProviderResult.totalChecks,
        passedChecks: multiProviderResult.passedChecks,
        durationMs: multiProviderResult.durationMs,
        providers: multiProviderResult.providerResults.map((pr) => ({
          provider: pr.provider,
          success: pr.success,
          checks: pr.checks,
          score: pr.score,
          demoMode: pr.demoMode,
          durationMs: pr.durationMs,
        })),
      },
      demoMode,
      selfAgentId: hasAgentId
        ? {
            verified: true,
            agentAddress: agentIdStatus.agentAddress,
            agentId: agentIdStatus.agentId,
            discountApplied: discountApplied,
          }
        : { verified: false },
      pricing: {
        tier: level,
        originalPrice: tierConfig.priceCUSD,
        finalPrice: adjustedPrice,
        discountApplied,
        discountPercent: discountApplied ? 20 : 0,
      },
      veniceVerdict: multiProviderResult.veniceVerdict ? {
        approve: multiProviderResult.veniceVerdict.approve,
        confidence: multiProviderResult.veniceVerdict.confidence,
        assuranceLevel: multiProviderResult.veniceVerdict.assuranceLevel,
        reasoning: multiProviderResult.veniceVerdict.reasoning,
        flags: multiProviderResult.veniceVerdict.flags,
        insights: multiProviderResult.veniceVerdict.insights,
        engine: multiProviderResult.veniceVerdict.engine,
        durationMs: multiProviderResult.veniceVerdict.durationMs,
        dataRetention: "none",
      } : undefined,
      privacy: getPrivacyAttestation(),
      message: demoMode
        ? "Demo mode: multi-provider verification simulated"
        : "Verification complete via Self Protocol + Didit + Human Passport.",
    });

    // Add rate limit headers
    response.headers.set("X-RateLimit-Limit", String(rateLimitResult.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimitResult.remaining));
    response.headers.set("X-RateLimit-Reset", rateLimitResult.resetAt.toISOString());

    return response;
  } catch (error) {
    console.error("Verification request error:", error);
    return NextResponse.json(
      { error: "Failed to create verification request" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const verificationId = searchParams.get("id");
  const userAddress = searchParams.get("userAddress");

  if (verificationId) {
    const requestData = verificationRequests.get(verificationId);
    if (!requestData) {
      return NextResponse.json(
        { error: "Verification not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      verificationId: requestData.id,
      status: requestData.status,
      level: requestData.level,
      attestationHash: requestData.attestationHash,
      paymentTxHash: requestData.paymentTxHash,
      createdAt: requestData.createdAt,
      expiresAt: requestData.expiresAt,
    });
  }

  if (userAddress) {
    // Find all verifications for a user
    const userVerifications = Array.from(verificationRequests.values())
      .filter((r) => r.userAddress === userAddress.toLowerCase())
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const latest = userVerifications[0];
    if (!latest) {
      return NextResponse.json({ verified: false });
    }

    return NextResponse.json({
      verified: latest.status === "completed",
      level: latest.level,
      attestationHash: latest.attestationHash,
      issuedAt: latest.createdAt,
      history: userVerifications.slice(0, 10).map((v) => ({
        verificationId: v.id,
        level: v.level,
        status: v.status,
        attestationHash: v.attestationHash,
        createdAt: v.createdAt,
      })),
    });
  }

  // Return stats
  const all = Array.from(verificationRequests.values());
  return NextResponse.json({
    totalVerifications: all.length,
    completed: all.filter((v) => v.status === "completed").length,
    pending: all.filter((v) => v.status === "pending").length,
    byLevel: {
      basic: all.filter((v) => v.level === "basic").length,
      standard: all.filter((v) => v.level === "standard").length,
      enhanced: all.filter((v) => v.level === "enhanced").length,
    },
  });
}
