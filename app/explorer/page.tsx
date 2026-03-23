"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface Attestation {
  id: string;
  userAddress: string;
  level: "basic" | "standard" | "enhanced";
  date: string;
  txHash: string;
  status: "valid" | "expired";
  expiresAt: string;
}

// Demo attestations
const DEMO_ATTESTATIONS: Attestation[] = [
  {
    id: "kyc_a1b2c3d4e5f6",
    userAddress: "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    level: "standard",
    date: "2026-03-18T03:01:42Z",
    txHash: "0xa3f8e2b1c4d9f6a0b7e3c5d8f1a2b4c6d0e7f9a1b3c5d7e9f2a4b6c8d0e2f4a6",
    status: "valid",
    expiresAt: "2027-03-18T03:01:42Z",
  },
  {
    id: "kyc_b9c8d7e6f5a4",
    userAddress: "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF",
    level: "enhanced",
    date: "2026-03-17T15:32:11Z",
    txHash: "0xb9c4f2a7e1d8b3c6f0a4e2d7b1c5f3a8e6d2b0c4f7a1e5d9b3c7f2a0e4d8b6c1",
    status: "valid",
    expiresAt: "2027-03-17T15:32:11Z",
  },
  {
    id: "kyc_c3d4e5f6a7b8",
    userAddress: "0x6813Eb9362372EEF6200f3b1dbC3f819671cBA69",
    level: "basic",
    date: "2026-03-16T09:14:55Z",
    txHash: "0xc2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2d5f8a1c4e7b0d3f6a9c2e5",
    status: "valid",
    expiresAt: "2027-03-16T09:14:55Z",
  },
  {
    id: "kyc_d5e6f7a8b9c0",
    userAddress: "0x1dF62f291b2E969fB0849d99D9Ce41e2F137006e",
    level: "standard",
    date: "2025-12-01T11:22:33Z",
    txHash: "0xd4f7a2e5b8c1d4f7a2e5b8c1d4f7a2e5b8c1d4f7a2e5b8c1d4f7a2e5b8c1d4f7",
    status: "expired",
    expiresAt: "2026-01-01T11:22:33Z",
  },
  {
    id: "kyc_e7f8a9b0c1d2",
    userAddress: "0x9C5086ab8e4B8DaE75d79A6CB0a2F63f99aC2D8b",
    level: "enhanced",
    date: "2026-03-15T20:45:17Z",
    txHash: "0xe6a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1",
    status: "valid",
    expiresAt: "2027-03-15T20:45:17Z",
  },
];

const levelConfig = {
  basic: {
    label: "Basic",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    badge: "badge-blue",
  },
  standard: {
    label: "Standard",
    color: "text-[#35D07F]",
    bg: "bg-[#35D07F]/10",
    border: "border-[#35D07F]/30",
    badge: "badge-green",
  },
  enhanced: {
    label: "Enhanced",
    color: "text-[#FCFF52]",
    bg: "bg-[#FCFF52]/10",
    border: "border-[#FCFF52]/30",
    badge: "badge-yellow",
  },
};

function shortenAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function shortenHash(hash: string) {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
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

export default function ExplorerPage() {
  const [search, setSearch] = useState("");
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(false);

  const totalStats = {
    total: DEMO_ATTESTATIONS.length,
    basic: DEMO_ATTESTATIONS.filter((a) => a.level === "basic").length,
    standard: DEMO_ATTESTATIONS.filter((a) => a.level === "standard").length,
    enhanced: DEMO_ATTESTATIONS.filter((a) => a.level === "enhanced").length,
    valid: DEMO_ATTESTATIONS.filter((a) => a.status === "valid").length,
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;

    setLoading(true);
    setSearched(false);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 600));

    const query = search.trim().toLowerCase();
    const found = DEMO_ATTESTATIONS.filter(
      (a) =>
        a.userAddress.toLowerCase().includes(query) ||
        a.txHash.toLowerCase().includes(query) ||
        a.id.toLowerCase().includes(query)
    );

    setResults(found);
    setSearched(true);
    setLoading(false);
  };

  const handleDemoSearch = (address: string) => {
    setSearch(address);
    const found = DEMO_ATTESTATIONS.filter((a) => a.userAddress === address);
    setResults(found);
    setSearched(true);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="badge badge-green text-xs">🔍 On-Chain Data</span>
              <span className="badge badge-blue text-xs">Live on Celo</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Attestation{" "}
              <span className="gradient-text">Explorer</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Look up on-chain KYC attestations by wallet address or transaction
              hash.
            </p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-white mb-1">
                {totalStats.total}
              </div>
              <div className="text-xs text-gray-500">Total Attestations</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-blue-400 mb-1">
                {totalStats.basic}
              </div>
              <div className="text-xs text-gray-500">Basic KYC</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-[#35D07F] mb-1">
                {totalStats.standard}
              </div>
              <div className="text-xs text-gray-500">Standard KYC</div>
            </div>
            <div className="glass-card rounded-2xl p-4 text-center">
              <div className="text-2xl font-black text-[#FCFF52] mb-1">
                {totalStats.enhanced}
              </div>
              <div className="text-xs text-gray-500">Enhanced KYC</div>
            </div>
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
                  placeholder="Enter wallet address (0x...) or tx hash..."
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
                  "Search"
                )}
              </button>
            </form>

            {/* Demo shortcuts */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-600">Try demo addresses:</span>
              {DEMO_ATTESTATIONS.slice(0, 3).map((a) => (
                <button
                  key={a.userAddress}
                  onClick={() => handleDemoSearch(a.userAddress)}
                  className="text-xs text-[#35D07F] hover:text-white font-mono bg-[#35D07F]/10 hover:bg-[#35D07F]/20 px-2 py-0.5 rounded transition-colors"
                >
                  {shortenAddress(a.userAddress)}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {searched && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold">
                  {results.length === 0
                    ? "No attestations found"
                    : `${results.length} attestation${results.length !== 1 ? "s" : ""} found`}
                </h2>
                <span className="text-xs text-gray-500 font-mono">
                  Network: Live on Celo
                </span>
              </div>

              {results.length === 0 ? (
                <div className="glass-card rounded-2xl p-10 text-center">
                  <div className="text-5xl mb-4">🔍</div>
                  <p className="text-gray-400">
                    No attestations found for this address.
                  </p>
                  <p className="text-gray-600 text-sm mt-2">
                    Try one of the demo addresses above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {results.map((att) => {
                    const cfg = levelConfig[att.level];
                    return (
                      <div
                        key={att.id}
                        className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                      >
                        {/* Level badge */}
                        <div
                          className={`w-14 h-14 rounded-xl ${cfg.bg} border ${cfg.border} flex flex-col items-center justify-center flex-shrink-0`}
                        >
                          <span className={`text-xs font-bold ${cfg.color}`}>
                            {cfg.label.toUpperCase()}
                          </span>
                          <span className="text-lg">
                            {att.level === "basic"
                              ? "📋"
                              : att.level === "standard"
                              ? "🔐"
                              : "🛡️"}
                          </span>
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-white font-mono text-sm">
                              {shortenAddress(att.userAddress)}
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                att.status === "valid"
                                  ? "bg-[#35D07F]/15 text-[#35D07F] border border-[#35D07F]/30"
                                  : "bg-red-500/15 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {att.status === "valid" ? "✓ Valid" : "✗ Expired"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-mono mb-1">
                            TX:{" "}
                            <a
                              href={`https://celoscan.io/tx/${att.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#35D07F] hover:underline"
                            >
                              {shortenHash(att.txHash)} ↗
                            </a>
                          </div>
                          <div className="text-xs text-gray-600">
                            Issued: {formatDate(att.date)} · Expires:{" "}
                            {formatDate(att.expiresAt)}
                          </div>
                        </div>

                        {/* CeloScan button */}
                        <a
                          href={`https://celoscan.io/tx/${att.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary text-xs px-3 py-2 flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          CeloScan
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* All attestations (shown by default) */}
          {!searched && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold">
                  Recent Attestations
                </h2>
                <span className="text-xs text-gray-500">
                  Showing {DEMO_ATTESTATIONS.length} records · Demo Data
                </span>
              </div>

              {/* Table */}
              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                          Address
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                          Level
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium hidden sm:table-cell">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                          TX Hash
                        </th>
                        <th className="text-left px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50">
                      {DEMO_ATTESTATIONS.map((att) => {
                        const cfg = levelConfig[att.level];
                        return (
                          <tr
                            key={att.id}
                            className="hover:bg-gray-800/30 transition-colors"
                          >
                            <td className="px-5 py-4">
                              <button
                                onClick={() =>
                                  handleDemoSearch(att.userAddress)
                                }
                                className="text-white font-mono text-xs hover:text-[#35D07F] transition-colors"
                              >
                                {shortenAddress(att.userAddress)}
                              </button>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`text-xs px-2 py-1 rounded-lg font-medium ${cfg.bg} ${cfg.color} border ${cfg.border}`}
                              >
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-4 hidden sm:table-cell">
                              <span className="text-gray-400 text-xs">
                                {formatDate(att.date)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <a
                                href={`https://celoscan.io/tx/${att.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#35D07F] font-mono text-xs hover:underline"
                              >
                                {shortenHash(att.txHash)} ↗
                              </a>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  att.status === "valid"
                                    ? "bg-[#35D07F]/10 text-[#35D07F]"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {att.status === "valid" ? "✓ Valid" : "✗ Expired"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
