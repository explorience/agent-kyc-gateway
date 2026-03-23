/**
 * Self Protocol v2 Integration
 *
 * Self Protocol provides ZK-SNARK based passport/ID verification via NFC.
 * Flow:
 * 1. Frontend displays QR code (via SelfAppBuilder)
 * 2. User scans with Self app on phone
 * 3. User taps NFC passport
 * 4. Self app generates ZK proof locally
 * 5. Proof sent to our callback endpoint
 * 6. Backend verifies proof via SelfBackendVerifier
 *
 * No API keys needed. No registration. Just scope + endpoint.
 */

import { SelfBackendVerifier, AllIds, DefaultConfigStore } from "@selfxyz/core";

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

const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || "https://knowyourhuman.xyz";
const SELF_SCOPE = "kyh-gateway";
const SELF_APP_NAME = "Know Your Human";

export function isSelfConfigured(): boolean {
  // Self doesn't need API keys - always configured
  return true;
}

/**
 * Create a verification session.
 * Returns session with a verification URL that renders a QR code.
 * User scans QR with Self app, taps passport NFC, proof comes back.
 */
export async function createVerificationSession(
  userId: string,
  level: string
): Promise<VerificationSession> {
  const sessionId = generateSessionId();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  
  // The endpoint where Self app will POST the proof
  const callbackEndpoint = `${GATEWAY_URL}/api/verification/${sessionId}/callback`;
  
  // Build the Self app config for the QR code
  // This will be consumed by the frontend SelfQRcodeWrapper component
  const qrConfig = JSON.stringify({
    version: 2,
    appName: SELF_APP_NAME,
    scope: SELF_SCOPE,
    endpoint: callbackEndpoint,
    endpointType: "https",
    userId: userId,
    sessionId: sessionId,
    level: level,
    disclosures: getDisclosuresForLevel(level),
  });

  return {
    sessionId,
    appId: SELF_APP_NAME,
    userId,
    verificationUrl: `${GATEWAY_URL}/verify/${sessionId}`,
    qrData: qrConfig,
    status: "pending",
    createdAt: new Date().toISOString(),
    expiresAt,
  };
}

/**
 * Verify a Self Protocol proof on the backend.
 * Called when the Self app POSTs a proof to our callback endpoint.
 */
export async function verifyProof(
  proof: string,
  publicSignals: string[],
  sessionId: string
): Promise<SelfVerificationResult> {
  const callbackEndpoint = `${GATEWAY_URL}/api/verification/${sessionId}/callback`;
  
  try {
    // Create verifier with production settings (mockPassport=false for mainnet)
    const verifier = new SelfBackendVerifier(
      SELF_SCOPE,
      callbackEndpoint,
      false, // mockPassport: false = mainnet verification
      AllIds, // Allow all attestation types (passport, ID card, etc.)
      new DefaultConfigStore({ minimumAge: 18, ofac: true }),
      "hex", // User identifier type (wallet addresses)
    );

    // verify(attestationId, proof, pubSignals, userContextData)
    // attestationId 1 = passport, proof is the ZK proof object
    const result = await verifier.verify(1 as never, proof as never, publicSignals as never, "" as never) as Record<string, unknown>;

    return {
      isVerified: result.isVerified as boolean,
      nationality: result.nationality as string | undefined,
      isAdult: result.isAdult as boolean | undefined,
      isHuman: result.isHuman as boolean | undefined,
      proof,
      nullifier: result.nullifier as string | undefined,
      demoMode: false,
    };
  } catch (error) {
    console.error("Self Protocol verification failed:", error);
    throw new Error("Proof verification failed");
  }
}

/**
 * Get disclosures for a verification level.
 * These control what the user reveals from their passport.
 */
function getDisclosuresForLevel(level: string): Record<string, unknown> {
  const base = {
    // Always request proof of valid passport (humanity proof)
    issuing_state: false,     // don't require specific country
    name: false,              // don't reveal name
    nationality: true,        // reveal nationality (for claims)
    date_of_birth: false,     // don't reveal exact DOB
    gender: false,
    expiry_date: false,
  };

  switch (level) {
    case "reputation":
    case "basic":
      return {
        ...base,
        nationality: false,   // minimal disclosure for basic
        minimumAge: 18,       // just verify 18+
      };
    case "document":
    case "standard":
      return {
        ...base,
        minimumAge: 18,
      };
    case "biometric":
      return {
        ...base,
        minimumAge: 18,
      };
    case "fullkyc":
    case "enhanced":
      return {
        ...base,
        nationality: true,    // need nationality for KYC
        minimumAge: 18,
        // ofac check is built into Self's ZK circuit
      };
    default:
      return {
        ...base,
        minimumAge: 18,
      };
  }
}

// Helper functions

function generateSessionId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
