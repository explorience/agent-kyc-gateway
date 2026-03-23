import { NextRequest, NextResponse } from "next/server";
import { getDiditDecision } from "@/lib/providers/didit";

/**
 * Didit Webhook/Callback
 *
 * Called by Didit when a verification session is completed.
 * Supports both:
 * - GET with query params (browser redirect callback)
 * - POST with JSON body (webhook)
 */

async function handleCallback(sessionId: string, status: string) {
  console.log(`Didit callback: session=${sessionId} status=${status}`);

  if (sessionId && status === "Approved") {
    const decision = await getDiditDecision(sessionId);
    if (decision) {
      console.log(`Didit decision for ${sessionId}: status=${decision.status}`);
      // TODO: Match session_id back to KYH verification request
      // and update attestation/claims with real Didit data
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("verificationSessionId") || searchParams.get("session_id") || "";
  const status = searchParams.get("status") || "";

  await handleCallback(sessionId, status);

  // Redirect to explorer or show confirmation
  return NextResponse.json({
    received: true,
    sessionId,
    status,
    message: status === "Approved"
      ? "Verification approved. Your credential will be issued shortly."
      : `Verification status: ${status}`,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.session_id || body.verificationSessionId || "";
    const status = body.status || "";

    await handleCallback(sessionId, status);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
