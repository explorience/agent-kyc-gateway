import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/check/{address}
 *
 * Free credential check. Returns the latest verification status for an address.
 * This is the "read forever for free" endpoint — any agent or dApp can call it.
 *
 * In production, this queries the EAS contract on Celo directly.
 * Currently uses the in-memory verification store for demo purposes.
 */

// Import verification requests from the store
import { verificationRequests } from "@/app/api/verification/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
    return NextResponse.json(
      { error: "Invalid Ethereum address" },
      { status: 400 }
    );
  }

  const normalizedAddress = address.toLowerCase();

  // Find latest completed verification for this address
  const verifications = Array.from(verificationRequests.values())
    .filter(
      (r) =>
        r.userAddress === normalizedAddress && r.status === "completed"
    )
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const latest = verifications[0];

  if (!latest) {
    return NextResponse.json(
      {
        verified: false,
        address: normalizedAddress,
        message: "No credential found. Use POST /api/verify to start verification.",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  }

  // Check if credential has expired (90 days)
  const issuedAt = new Date(latest.createdAt);
  const expiresAt = new Date(issuedAt.getTime() + 90 * 24 * 60 * 60 * 1000);
  const isExpired = new Date() > expiresAt;

  if (isExpired) {
    return NextResponse.json(
      {
        verified: false,
        expired: true,
        address: normalizedAddress,
        lastTier: latest.level,
        expiredAt: expiresAt.toISOString(),
        message: "Credential expired. Use POST /api/verify to re-verify.",
      },
      {
        headers: {
          "Cache-Control": "public, max-age=60",
        },
      }
    );
  }

  return NextResponse.json(
    {
      verified: true,
      address: normalizedAddress,
      tier: latest.level,
      attestationUID: latest.attestationHash,
      issuedAt: latest.createdAt,
      expiresAt: expiresAt.toISOString(),
      onChain: latest.attestationHash
        ? `https://celo.easscan.org/attestation/view/${latest.attestationHash}`
        : null,
      // Agents can also query EAS directly:
      directQuery: {
        contract: "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
        schemaUID:
          "0x23b867f11eb49a6d94a6490e11aa2c4fd2dbbda5950b8444281ed2953daad5ab",
        chain: "celo",
        chainId: 42220,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}
