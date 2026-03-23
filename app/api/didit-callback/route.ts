import { NextRequest, NextResponse } from "next/server";
import { getDiditDecision } from "@/lib/providers/didit";

/**
 * Didit Webhook Callback
 *
 * Called by Didit when a verification session is completed.
 * Receives the session_id and status, fetches the full decision.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, status } = body;

    console.log(`Didit webhook: session=${session_id} status=${status}`);

    // Fetch the full decision from Didit
    if (session_id && status === "Approved") {
      const decision = await getDiditDecision(session_id);
      if (decision) {
        console.log(`Didit decision for ${session_id}:`, JSON.stringify(decision, null, 2));
        // TODO: Update the verification request status and issue/update attestation
        // This would match the session_id back to a KYH verification request
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Didit webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
