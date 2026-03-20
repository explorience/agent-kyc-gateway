import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  registerAttestation,
  VERIFICATION_LEVELS,
  checkOdisQuota,
} from "@/lib/self-protocol";
import {
  createVerificationSession,
  isSelfConfigured,
} from "@/lib/self-protocol-v2";
import { generate402Header, verifyPayment, PAYMENT_TIERS } from "@/lib/x402";
import { isRegisteredAgent } from "@/lib/erc8004";
import { checkRateLimit, getRetryAfter } from "@/lib/rate-limiter";
import type { Address } from "viem";

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
      level = "basic",
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

    const verificationLevel = VERIFICATION_LEVELS[level];
    if (!verificationLevel) {
      return NextResponse.json(
        {
          error:
            "Invalid verification level. Use: basic, standard, or enhanced",
        },
        { status: 400 }
      );
    }

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
    const rateLimitResult = checkRateLimit(agentAddress, level);
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

    const tier = PAYMENT_TIERS[level];

    // x402 Payment gate
    // If no payment header and not skipping payment, return 402
    if (!paymentHeader && !skipPayment) {
      const resource = `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000"}/api/verification`;
      const paymentRequirements = generate402Header(
        level as "basic" | "standard" | "enhanced",
        resource
      );

      return NextResponse.json(
        {
          error: "Payment Required",
          paymentRequired: {
            amount: tier.priceCUSD,
            currency: "cUSD",
            network: "celo-sepolia",
            paymentRequirements,
            tier: tier.level,
            description: tier.description,
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

    // Verify payment if provided
    let paymentReceipt = null;
    if (paymentHeader) {
      const paymentResult = await verifyPayment(
        paymentHeader,
        tier.priceCUSD,
        level as "basic" | "standard" | "enhanced"
      );
      if (!paymentResult.success) {
        return NextResponse.json(
          { error: `Payment verification failed: ${paymentResult.error}` },
          { status: 402 }
        );
      }
      paymentReceipt = paymentResult.receipt;
    }

    // Check ODIS quota in demo mode
    const hasIssuerKey = process.env.ISSUER_PRIVATE_KEY;
    if (hasIssuerKey) {
      try {
        const quota = await checkOdisQuota();
        console.log(`ODIS Quota available: ${quota}`);
      } catch (err) {
        console.warn("ODIS quota check failed (continuing):", err);
      }
    } else {
      console.log("Demo mode: Skipping ODIS quota check");
    }

    // Create verification request
    const verificationId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const requestData = {
      id: verificationId,
      agentAddress: agentAddress.toLowerCase(),
      agentId: agentId !== undefined ? Number(agentId) : undefined,
      userAddress: userAddress.toLowerCase(),
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
      level as "basic" | "standard" | "enhanced"
    );

    // Store the Self session ID for webhook callbacks
    const storedRequest = verificationRequests.get(verificationId)!;
    storedRequest.selfSessionId = selfSession.sessionId;

    // On-chain attestation via ODIS/FederatedAttestations
    if (hasIssuerKey) {
      try {
        const result = await registerAttestation(
          `+1555${userAddress.slice(-7)}`,
          userAddress as Address
        );
        storedRequest.status = "completed";
        storedRequest.attestationHash = result.transactionHash;
        console.log(
          `Verification completed for ${userAddress}:`,
          result.transactionHash
        );
      } catch (error) {
        console.error("Attestation registration failed:", error);
        storedRequest.status = "pending";
      }
    } else {
      // Demo mode
      storedRequest.status = "completed";
      storedRequest.attestationHash =
        "0xdemo" + Math.random().toString(16).slice(2, 10);
      console.log(`Demo mode: Verification simulated for ${userAddress}`);
    }

    const demoMode = !hasIssuerKey && !isSelfConfigured();

    const response = NextResponse.json({
      verificationId,
      status: storedRequest.status,
      level,
      agentId: requestData.agentId,
      expiresAt,
      selfVerificationUrl: selfSession.verificationUrl,
      selfQrData: selfSession.qrData,
      attestationHash: storedRequest.attestationHash,
      paymentReceipt,
      demoMode,
      message: demoMode
        ? "Demo mode: verification simulated"
        : "Verification initiated. Complete via Self Protocol app.",
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
