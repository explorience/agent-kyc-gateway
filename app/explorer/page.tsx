"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface CheckResult {
  verified: boolean;
  address?: string;
  ensName?: string;
  ensAvatar?: string;
  resolvedFrom?: string;
  tier?: string;
  attestationUID?: string;
  issuedAt?: string;
  expiresAt?: string;
  expired?: boolean;
  lastTier?: string;
  expiredAt?: string;
  claims?: Record<string, unknown>;
  providers?: Record<string, unknown>;
  evidence?: {
    hash: string;
    url: string;
    ipfs?: string;
    ipfsGateway?: string;
  };
  onChain?: string;
  message?: string;
}

const tierConfig: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  reputation: {
    label: "Reputation",
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    border: "border-gray-500/30",
    emoji: "🌐",
  },
  document: {
    label: "Document",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    emoji: "📋",
  },
  biometric: {
    label: "Biometric",
    color: "text-[#35D07F]",
    bg: "bg-[#35D07F]/10",
    border: "border-[#35D07F]/30",
    emoji: "🔐",
  },
  fullkyc: {
    label: "Full KYC",
    color: "text-[#FCFF52]",
    bg: "bg-[#FCFF52]/10",
    border: "border-[#FCFF52]/30",
    emoji: "🛡️",
  },
  // Legacy names
  basic: {
    label: "Document",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    emoji: "📋",
  },
  standard: {
    label: "Biometric",
    color: "text-[#35D07F]",
    bg: "bg-[#35D07F]/10",
    border: "border-[#35D07F]/30",
    emoji: "🔐",
  },
  enhanced: {
    label: "Full KYC",
    color: "text-[#FCFF52]",
    bg: "bg-[#FCFF52]/10",
    border: "border-[#FCFF52]/30",
    emoji: "🛡️",
  },
};

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DisplayAddress({ address, ensName, ensAvatar }: { address?: string; ensName?: string; ensAvatar?: string }) {
  return (
    <div className="flex items-center gap-2">
      {ensAvatar && (
        <img src={ensAvatar} alt="" className="w-6 h-6 rounded-full" />
      )}
      <div>
        {ensName && (
          <span className="text-[#35D07F] font-semibold text-sm">{ensName}</span>
        )}
        {address && (
          <span className={`font-mono text-xs ${ensName ? "text-gray-500 ml-2" : "text-white"}`}>
            {shortenAddress(address)}
          </span>
        )}
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setSearched(false);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/check/${encodeURIComponent(search.trim())}`);
      const data = await response.json();

      if (!response.ok && response.status !== 200) {
        setError(data.error || "Lookup failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error. Please try again.");
    }

    setSearched(true);
    setLoading(false);
  };

  const handleQuickSearch = (addr: string) => {
    setSearch(addr);
    // Trigger search
    setLoading(true);
    setSearched(false);
    setError(null);
    setResult(null);

    fetch(`/api/check/${encodeURIComponent(addr)}`)
      .then((r) => r.json())
      .then((data) => {
        setResult(data);
        setSearched(true);
        setLoading(false);
      })
      .catch(() => {
        setError("Network error");
        setSearched(true);
        setLoading(false);
      });
  };

  const tier = result?.tier || result?.lastTier || "reputation";
  const cfg = tierConfig[tier] || tierConfig.reputation;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="badge badge-green text-xs">Live on Celo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Credential{" "}
              <span className="gradient-text">Explorer</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Look up KYH credentials by wallet address or ENS name. Free, no auth required.
            </p>
          </div>

          {/* Search bar */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <svg
                    className="w-4 h-4 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Wallet address (0x...) or ENS name (vitalik.eth)"
                  className="input-field pl-9"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !search.trim()}
                className="btn-primary px-5 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Check"
                )}
              </button>
            </form>

            {/* Quick lookups */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600">Try:</span>
              <button
                onClick={() => handleQuickSearch("vitalik.eth")}
                className="text-xs text-[#35D07F] hover:text-white font-mono bg-[#35D07F]/10 hover:bg-[#35D07F]/20 px-2 py-0.5 rounded transition-colors"
              >
                vitalik.eth
              </button>
              <button
                onClick={() => handleQuickSearch("0x80370645C98f05Ad86BdF676FaE54afCDBF5BC10")}
                className="text-xs text-[#35D07F] hover:text-white font-mono bg-[#35D07F]/10 hover:bg-[#35D07F]/20 px-2 py-0.5 rounded transition-colors"
              >
                0x8037...BC10
              </button>
            </div>
          </div>

          {/* Error */}
          {searched && error && (
            <div className="glass-card rounded-2xl p-6 text-center border border-red-500/30">
              <div className="text-3xl mb-3">⚠️</div>
              <p className="text-red-400 font-medium">{error}</p>
            </div>
          )}

          {/* Result */}
          {searched && result && !error && (
            <div className="space-y-4">
              {/* Identity card */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  {/* Avatar / Badge */}
                  <div className={`w-16 h-16 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                    {result.ensAvatar ? (
                      <img src={result.ensAvatar} alt="" className="w-12 h-12 rounded-lg" />
                    ) : (
                      <span className="text-2xl">{result.verified ? cfg.emoji : "❌"}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* ENS name */}
                    {result.ensName && (
                      <h2 className="text-xl font-bold text-white mb-0.5">{result.ensName}</h2>
                    )}

                    {/* Address */}
                    <p className="font-mono text-sm text-gray-400 break-all">
                      {result.address}
                    </p>

                    {/* Resolved from */}
                    {result.resolvedFrom && (
                      <p className="text-xs text-gray-600 mt-1">
                        Resolved from: {result.resolvedFrom}
                      </p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="flex-shrink-0">
                    {result.verified ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-[#35D07F]/15 text-[#35D07F] border border-[#35D07F]/30">
                        ✓ Verified
                      </span>
                    ) : result.expired ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30">
                        ⏰ Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-500/15 text-gray-400 border border-gray-500/30">
                        ✗ Not Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Credential details (if verified or expired) */}
              {(result.verified || result.expired) && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Credential Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Tier</div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-sm font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        {cfg.emoji} {cfg.label}
                      </span>
                    </div>
                    {result.issuedAt && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Issued</div>
                        <div className="text-white text-sm">{formatDate(result.issuedAt)}</div>
                      </div>
                    )}
                    {(result.expiresAt || result.expiredAt) && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                          {result.expired ? "Expired" : "Expires"}
                        </div>
                        <div className={`text-sm ${result.expired ? "text-orange-400" : "text-white"}`}>
                          {formatDate(result.expiresAt || result.expiredAt || "")}
                        </div>
                      </div>
                    )}
                    {result.attestationUID && (
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Attestation</div>
                        <a
                          href={result.onChain || `https://celo.easscan.org/attestation/view/${result.attestationUID}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#35D07F] text-sm hover:underline font-mono"
                        >
                          {result.attestationUID.slice(0, 12)}... ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Claims (if available) */}
              {result.claims && Object.keys(result.claims).length > 0 && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Structured Claims</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(result.claims).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className={`text-sm ${value ? "text-[#35D07F]" : "text-gray-600"}`}>
                          {value ? "✓" : "✗"}
                        </span>
                        <span className="text-sm text-gray-300">{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence */}
              {result.evidence && (
                <div className="glass-card rounded-2xl p-6">
                  <h3 className="text-white font-semibold mb-4">Evidence</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Hash</span>
                      <a
                        href={result.evidence.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#35D07F] text-xs hover:underline font-mono"
                      >
                        {result.evidence.hash.slice(0, 16)}... ↗
                      </a>
                    </div>
                    {result.evidence.ipfs && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">IPFS</span>
                        <a
                          href={result.evidence.ipfsGateway}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#35D07F] text-xs hover:underline font-mono"
                        >
                          {result.evidence.ipfs.slice(0, 20)}... ↗
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Not verified message */}
              {!result.verified && !result.expired && (
                <div className="glass-card rounded-2xl p-6 text-center">
                  <p className="text-gray-400 text-sm">
                    {result.message || "This address has no KYH credential."}
                  </p>
                  <a
                    href="/demo"
                    className="inline-block mt-3 text-[#35D07F] text-sm hover:underline"
                  >
                    Start verification →
                  </a>
                </div>
              )}
            </div>
          )}

          {/* How it works (shown by default) */}
          {!searched && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">How It Works</h3>
              <div className="space-y-4 text-sm text-gray-400">
                <div className="flex gap-3">
                  <span className="text-[#35D07F] font-bold">1.</span>
                  <div>
                    <span className="text-white">Enter any wallet address or ENS name</span>
                    <span className="text-gray-600"> - both work</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#35D07F] font-bold">2.</span>
                  <div>
                    <span className="text-white">See verification status, tier, and structured claims</span>
                    <span className="text-gray-600"> - free, no auth needed</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="text-[#35D07F] font-bold">3.</span>
                  <div>
                    <span className="text-white">Click through to on-chain attestation on CeloScan</span>
                    <span className="text-gray-600"> - verify independently</span>
                  </div>
                </div>
                <div className="mt-4 p-3 rounded-lg bg-[#35D07F]/5 border border-[#35D07F]/20">
                  <p className="text-gray-300 text-xs">
                    <strong className="text-[#35D07F]">For agents:</strong>{" "}
                    Use <code className="text-[#35D07F]">GET /api/check/{'<address>'}</code> directly.
                    Returns structured claims as JSON. Free, no API key required.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
