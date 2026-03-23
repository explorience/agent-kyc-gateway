/**
 * Didit KYC Provider — Real API Integration
 *
 * Uses Didit v3 API at verification.didit.me
 * Auth: X-API-Key header
 *
 * Workflows available:
 * - Biometric Auth ($0.18): LIVENESS + FACE_MATCH + IP_ANALYSIS
 * - Custom KYC ($0.33): OCR + LIVENESS + FACE_MATCH + IP_ANALYSIS (default)
 * - KYC + AML ($0.65): OCR + LIVENESS + FACE_MATCH + AML + IP_ANALYSIS
 * - Age Estimation ($0.28): AGE_ESTIMATION + OCR + IP_ANALYSIS
 *
 * Demo mode activates when DIDIT_API_KEY is not configured.
 */

import type { ProviderResult, ProviderCheck } from "./index";

const DIDIT_API_BASE = "https://verification.didit.me";

// Workflow IDs from our Didit account
const WORKFLOWS = {
  biometric: "d9c23277-d740-4fbb-b7e4-c7dc0c2912c7",    // $0.18 - LIVENESS + FACE_MATCH + IP
  customKyc: "18b201ed-ba03-442f-bbb9-9ba7a83826a8",     // $0.33 - OCR + LIVENESS + FACE_MATCH + IP (default)
  kycAml: "0bdae62b-c37c-4327-9989-2712a634dae8",        // $0.65 - OCR + LIVENESS + FACE_MATCH + AML + IP
  ageEstimation: "a2899b09-61b1-41ef-8b9d-991e703ef7f2",  // $0.28 - AGE_ESTIMATION + OCR + IP
};

function isDemoMode(): boolean {
  return !process.env.DIDIT_API_KEY;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface DiditSession {
  sessionId: string;
  sessionToken: string;
  url: string;
  status: string;
  workflowId: string;
}

export interface DiditDecision {
  session_id: string;
  status: string;
  // OCR results
  ocr?: {
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    document_type?: string;
    document_number?: string;
    country?: string;
    expiry_date?: string;
    status?: string;
  };
  // Liveness
  liveness?: {
    status?: string;
    score?: number;
  };
  // Face match
  face_match?: {
    status?: string;
    score?: number;
  };
  // AML
  aml?: {
    status?: string;
    hits?: number;
    watchlists?: string[];
  };
  // IP analysis
  ip_analysis?: {
    country?: string;
    is_vpn?: boolean;
    is_proxy?: boolean;
    risk_score?: number;
  };
  // Overall
  decision?: string;
  created_at?: string;
}

/**
 * Create a Didit verification session.
 * Returns a URL the user opens in their browser to complete verification.
 */
export async function createDiditSession(
  level: string,
  vendorData: string,
  callbackUrl?: string,
): Promise<DiditSession> {
  if (isDemoMode()) {
    return {
      sessionId: `demo-${Date.now()}`,
      sessionToken: "demo-token",
      url: "https://verify.didit.me/demo",
      status: "Not Started",
      workflowId: "demo",
    };
  }

  // Pick workflow based on tier
  let workflowId: string;
  if (level === "biometric" || level === "standard") {
    workflowId = WORKFLOWS.customKyc; // OCR + LIVENESS + FACE_MATCH + IP
  } else if (level === "fullkyc" || level === "enhanced") {
    workflowId = WORKFLOWS.kycAml; // Full KYC + AML
  } else {
    workflowId = WORKFLOWS.customKyc; // Default
  }

  const body: Record<string, string> = {
    workflow_id: workflowId,
    vendor_data: vendorData,
  };

  if (callbackUrl) {
    body.callback = callbackUrl;
  }

  const response = await fetch(`${DIDIT_API_BASE}/v3/session/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": process.env.DIDIT_API_KEY!,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Didit session creation failed:", response.status, error);
    throw new Error(`Didit session creation failed: ${response.status} ${error}`);
  }

  const data = await response.json();

  return {
    sessionId: data.session_id,
    sessionToken: data.session_token,
    url: data.url,
    status: data.status,
    workflowId: data.workflow_id,
  };
}

/**
 * Get the decision/result for a completed Didit session.
 */
export async function getDiditDecision(sessionId: string): Promise<DiditDecision | null> {
  if (isDemoMode()) {
    return null;
  }

  const response = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`, {
    headers: {
      "X-API-Key": process.env.DIDIT_API_KEY!,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return null; // Session not completed yet
    console.error("Didit decision fetch failed:", response.status);
    return null;
  }

  return response.json();
}

/**
 * Get session status
 */
export async function getDiditSessionStatus(sessionId: string): Promise<string> {
  if (isDemoMode()) return "Approved";

  try {
    const response = await fetch(`${DIDIT_API_BASE}/v3/session/${sessionId}/decision/`, {
      headers: {
        "X-API-Key": process.env.DIDIT_API_KEY!,
      },
    });

    if (!response.ok) return "Pending";
    const data = await response.json();
    return data.status || "Pending";
  } catch {
    return "Pending";
  }
}

/**
 * Run Didit verification suite based on tier level.
 *
 * This creates a session and returns immediately with a verification URL.
 * The actual verification happens asynchronously when the user completes the flow.
 * Use the webhook callback or poll getDiditDecision() for results.
 */
export async function verifyWithDidit(
  level: string,
  userAddress: string
): Promise<ProviderResult> {
  const start = Date.now();
  const demoMode = isDemoMode();
  const checks: ProviderCheck[] = [];

  if (demoMode) {
    // Demo mode: simulate checks
    await sleep(600 + Math.random() * 400);

    checks.push({
      type: "document",
      passed: true,
      details: "Demo: passport from CA — authenticity 96%",
      confidence: 96,
    });

    checks.push({
      type: "face-match",
      passed: true,
      details: "Demo: Face similarity 94%",
      confidence: 94,
    });

    checks.push({
      type: "liveness",
      passed: true,
      details: "Demo: Liveness score 97%",
      confidence: 97,
    });

    if (level === "enhanced" || level === "fullkyc") {
      checks.push({
        type: "aml",
        passed: true,
        details: "Demo: Cleared against 4 watchlists (OFAC, EU, UN, PEP)",
        confidence: 100,
      });
    }

    return {
      provider: "didit",
      success: true,
      checks,
      score: 95,
      attestationData: {
        documentVerified: true,
        faceMatched: true,
        country: "CA",
        demoMode: true,
      },
      demoMode: true,
      durationMs: Date.now() - start,
    };
  }

  // Production mode: create a real Didit session
  try {
    const callbackUrl = `${process.env.NEXT_PUBLIC_GATEWAY_URL || "https://knowyourhuman.xyz"}/api/didit-callback`;
    const session = await createDiditSession(
      level,
      `kyh-${userAddress.slice(0, 10)}-${Date.now()}`,
      callbackUrl
    );

    // Session created - verification happens asynchronously
    // The user needs to open the URL and complete the flow
    checks.push({
      type: "document",
      passed: true,
      details: `Didit session created. User must complete verification at: ${session.url}`,
      confidence: 0, // Not yet verified
    });

    checks.push({
      type: "liveness",
      passed: true,
      details: `Session ID: ${session.sessionId} — Status: ${session.status}`,
      confidence: 0,
    });

    return {
      provider: "didit",
      success: true, // Session created successfully, verification pending
      checks,
      score: 50, // Pending score until user completes verification
      attestationData: {
        diditSessionId: session.sessionId,
        diditVerificationUrl: session.url,
        diditWorkflowId: session.workflowId,
        sessionCreated: true,
        verificationPending: true,
      },
      demoMode: false,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    console.error("Didit verification error:", error);
    checks.push({
      type: "document",
      passed: false,
      details: `Didit session creation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      confidence: 0,
    });

    return {
      provider: "didit",
      success: false,
      checks,
      score: 0,
      attestationData: { error: true },
      demoMode: false,
      durationMs: Date.now() - start,
    };
  }
}
