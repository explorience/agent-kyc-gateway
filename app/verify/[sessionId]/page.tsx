"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Header from "@/components/Header";
import AttestationBadge from "@/components/AttestationBadge";

interface VerificationStatus {
  verificationId: string;
  status: "pending" | "completed" | "failed";
  level: string;
  attestationHash?: string;
  createdAt: string;
  expiresAt: string;
}

export default function VerifyPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState("");
  const [qrUrl] = useState(`/verify/${sessionId}`);
  const [pollCount, setPollCount] = useState(0);
  const [agentInfo, setAgentInfo] = useState<{
    agentId: number;
    name?: string;
    description?: string;
  } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/verification/${sessionId}/callback`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        return data.status;
      }
    } catch {
      // ignore
    }
    return null;
  }, [sessionId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchStatus();
      setLoading(false);
    };
    load();
  }, [fetchStatus]);

  // Poll for status updates
  useEffect(() => {
    if (status?.status === "completed" || status?.status === "failed") return;

    const interval = setInterval(async () => {
      const s = await fetchStatus();
      setPollCount((c) => c + 1);
      if (s === "completed" || s === "failed") {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [status?.status, fetchStatus]);

  const handleDemoComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/verification/${sessionId}/callback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus({
          verificationId: sessionId,
          status: "completed",
          level: data.level || "basic",
          attestationHash: data.attestationHash,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        });
      } else {
        setError(data.error || "Completion failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-[#35D07F] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          {/* Agent info banner */}
          {agentInfo && (
            <div className="bg-[#111827] border border-[#35D07F]/20 rounded-2xl p-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#35D07F]/10 flex items-center justify-center text-lg">
                  🤖
                </div>
                <div>
                  <p className="text-white text-sm font-medium">
                    {agentInfo.name || `Agent #${agentInfo.agentId}`}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {agentInfo.description || "Registered on ERC-8004"}
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="text-xs bg-[#35D07F]/10 text-[#35D07F] px-2 py-1 rounded-full">
                    Verified Agent
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-[#35D07F]/10 border border-[#35D07F]/30 flex items-center justify-center text-3xl mx-auto mb-4">
              📱
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Identity Verification
            </h1>
            <p className="text-gray-400 text-sm">
              {agentInfo
                ? `${agentInfo.name || `Agent #${agentInfo.agentId}`} is requesting your identity verification`
                : "Verify your identity with Self Protocol — your data never leaves your device"}
            </p>
          </div>

          {/* Status card */}
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 mb-6">
            {status?.status === "completed" ? (
              <div className="text-center">
                <div className="text-5xl mb-4">✅</div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Verification Complete!
                </h2>
                <p className="text-gray-400 text-sm mb-4">
                  Your identity has been verified and attestation recorded on
                  Celo.
                </p>
                <AttestationBadge
                  level={(status.level as "basic" | "standard" | "enhanced") || "basic"}
                  issuedAt={status.createdAt}
                  txHash={status.attestationHash}
                />
                {status.attestationHash && (
                  <a
                    href={`https://celo.blockscout.com/tx/${status.attestationHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-[#35D07F] text-sm hover:underline"
                  >
                    View on CeloScan ↗
                  </a>
                )}
              </div>
            ) : status?.status === "failed" ? (
              <div className="text-center">
                <div className="text-5xl mb-4">❌</div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-400 text-sm">
                  The verification could not be completed. Please try again.
                </p>
              </div>
            ) : (
              <div>
                {/* Pending state - show QR / demo button */}
                <div className="text-center mb-4">
                  <div className="w-8 h-8 border-2 border-[#35D07F] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">
                    Waiting for verification...{" "}
                    {pollCount > 0 && (
                      <span className="text-gray-600">
                        (checked {pollCount}x)
                      </span>
                    )}
                  </p>
                </div>

                {/* Demo mode QR simulation */}
                <div className="bg-[#0d1117] border border-gray-700 rounded-xl p-4 mb-4">
                  <p className="text-xs text-gray-500 text-center mb-3">
                    Demo Mode — Self Protocol QR Code
                  </p>
                  {/* Simulated QR code */}
                  <div className="w-48 h-48 mx-auto bg-white rounded-lg p-2 flex items-center justify-center">
                    <div className="w-full h-full grid grid-cols-7 gap-0.5 opacity-80">
                      {Array.from({ length: 49 }, (_, i) => (
                        <div
                          key={i}
                          className={`rounded-sm ${
                            Math.random() > 0.5
                              ? "bg-gray-900"
                              : "bg-white"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 text-center mt-2">
                    Session: {sessionId.slice(0, 16)}...
                  </p>
                </div>

                <p className="text-xs text-gray-500 text-center mb-4">
                  In production: Scan with Self app → NFC scan passport →
                  ZK proof generated automatically
                </p>

                <button
                  onClick={handleDemoComplete}
                  disabled={completing}
                  className="w-full py-3 bg-[#35D07F] text-[#0a0a0a] font-semibold rounded-xl hover:bg-[#2db86e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {completing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                      Generating ZK Proof...
                    </>
                  ) : (
                    "✨ Simulate Verification (Demo)"
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div className="text-center">
            <p className="text-xs text-gray-600">
              🔒 Your personal data is never stored or transmitted — only a ZK
              proof that you meet the verification criteria.
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-800/30 rounded-xl text-red-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
