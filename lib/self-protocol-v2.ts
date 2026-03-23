/**
 * Self Protocol v2 Integration
 *
 * Self Protocol provides ZK-SNARK based passport/ID verification via NFC.
 * This module wraps @selfxyz/core with graceful fallback to demo mode
 * when SELF_APP_ID is not configured.
 *
 * In production: real ZK proof verification
 * In demo mode: simulated verification flow for hackathon demos
 */

export interface SelfVerificationConfig {
  appId: string;
  scope: string;
  devMode?: boolean;
}

export interface SelfVerificationResult {
  isVerified: boolean;
  nationality?: string;
  isAdult?: boolean;
  isHuman?: boolean;
  proof?: string;
  nullifier?: string;
  demoMode?: boolean;
}

export interface VerificationSession {
  sessionId: string;
  appId: string;
  userId: string;
  verificationUrl: string;
  qrData: string;
  status: "pending" | "completed" | "failed" | "expired";
  result?: SelfVerificationResult;
  createdAt: string;
  expiresAt: string;
}

// Check if Self Protocol is configured
export function isSelfConfigured(): boolean {
  return !!process.env.SELF_APP_ID;
}

/**
 * Create a verification session.
 * Returns a session with QR code data for the user to scan.
 * Falls back to demo mode if SELF_APP_ID is not set.
 */
export async function createVerificationSession(
  userId: string,
  level: string
): Promise<VerificationSession> {
  const sessionId = generateSessionId();
  const isDemoMode = !isSelfConfigured();
  const appId = process.env.SELF_APP_ID || "demo-app-id";
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000";

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  if (isDemoMode) {
    // Demo mode: generate simulated QR data
    const qrData = JSON.stringify({
      appId: "DEMO-KYC-GATEWAY",
      sessionId,
      userId,
      level,
      callbackUrl: `${gatewayUrl}/api/verification/${sessionId}/callback`,
      demo: true,
    });

    return {
      sessionId,
      appId,
      userId,
      verificationUrl: `${gatewayUrl}/verify/${sessionId}`,
      qrData,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt,
    };
  }

  // Real Self Protocol integration
  try {
    // Import Self Protocol SDK dynamically to avoid SSR issues
    const { SelfBackendVerifier } = await import("@selfxyz/core");

    const scopes = getScopesForLevel(level);

    // In production: create session with Self Protocol API
    // The QR code data is the deeplink/universal link for the Self app
    const selfAppLink = `https://app.self.xyz/verify?appId=${appId}&sessionId=${sessionId}&scope=${scopes.join(",")}`;

    return {
      sessionId,
      appId,
      userId,
      verificationUrl: `${gatewayUrl}/verify/${sessionId}`,
      qrData: selfAppLink,
      status: "pending",
      createdAt: new Date().toISOString(),
      expiresAt,
    };
  } catch {
    // Fallback to demo if SDK not available
    console.warn("Self Protocol SDK unavailable, using demo mode");
    return createVerificationSession(userId, level);
  }
}

/**
 * Verify a Self Protocol proof on the backend.
 * Used in the webhook callback endpoint.
 */
export async function verifyProof(
  proof: string,
  publicSignals: string[],
  sessionId: string
): Promise<SelfVerificationResult> {
  const isDemoMode = !isSelfConfigured();

  if (isDemoMode) {
    // Demo: simulate successful verification
    await sleep(500); // Realistic delay
    return {
      isVerified: true,
      nationality: "US",
      isAdult: true,
      isHuman: true,
      proof: "0x" + "a".repeat(64),
      nullifier: "0x" + "b".repeat(64),
      demoMode: true,
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selfCore = await import("@selfxyz/core") as any;
    const SelfBackendVerifier = selfCore.SelfBackendVerifier;

    const appId = process.env.SELF_APP_ID!;
    const scope = "kyc-gateway";
    const callbackUrl = `${process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:3000"}/api/verification/${sessionId}/callback`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const verifier = new SelfBackendVerifier(appId, callbackUrl, scope, false, {}, {}) as any;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await verifier.verify(proof, publicSignals) as any;

    return {
      isVerified: result.isVerified,
      nationality: result.nationality,
      isAdult: result.isAdult,
      isHuman: result.isHuman,
      proof,
      nullifier: result.nullifier,
      demoMode: false,
    };
  } catch (error) {
    console.error("Self Protocol verification failed:", error);
    throw new Error("Proof verification failed");
  }
}

/**
 * Simulate a demo verification completion.
 * In production, this is triggered by the Self Protocol webhook.
 */
export async function simulateDemoVerification(
  sessionId: string
): Promise<SelfVerificationResult> {
  await sleep(2000); // Simulate processing time

  return {
    isVerified: true,
    nationality: "CA",
    isAdult: true,
    isHuman: true,
    proof: "0x" + randomHex(64),
    nullifier: "0x" + randomHex(64),
    demoMode: true,
  };
}

// Helper functions

function getScopesForLevel(level: string): string[] {
  switch (level) {
    case "basic":
      return ["humanity_proof"];
    case "standard":
      return ["humanity_proof", "nationality", "age_18_plus"];
    case "enhanced":
      return ["humanity_proof", "nationality", "age_18_plus", "not_sanctioned"];
    default:
      return ["humanity_proof"];
  }
}

function generateSessionId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

function randomHex(length: number): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
