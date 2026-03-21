"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CodeBlock from "@/components/CodeBlock";

interface Endpoint {
  id: string;
  method: "GET" | "POST";
  path: string;
  description: string;
  requestBody?: string;
  responseBody: string;
  curlExample: string;
  notes?: string;
}

const BASE_URL = "https://kyc-gateway.vercel.app";

const endpoints: Endpoint[] = [
  {
    id: "request-verification",
    method: "POST",
    path: "/api/verification",
    description:
      "Request a new KYC verification session for a user. Returns a session ID and verification URL to send to the user. Payment via x402 required ($0.001–$0.75 cUSD depending on level).",
    requestBody: `{
  "userAddress": "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
  "agentAddress": "0x3fA8B653F9abf91428800C8bB0AB9d8fE8c7A8c3",
  "level": "standard",
  "webhookUrl": "https://my-agent.xyz/kyc-callback"
}

// Fields:
// userAddress  (required) - Wallet address of the user to verify
// agentAddress (optional) - Wallet address of the requesting agent
// level        (required) - "starter" | "basic" | "standard" | "enhanced"
// webhookUrl   (optional) - POST webhook when verification completes`,
    responseBody: `{
  "sessionId": "kyc_x7k2m9p4n1q8r3s5",
  "status": "pending",
  "level": "standard",
  "verifyUrl": "https://kyc-gateway.vercel.app/verify/kyc_x7k2m9p4n1q8r3s5",
  "expiresAt": "2026-03-18T04:01:00Z",
  "fee": {
    "amount": "1.50",
    "currency": "cUSD",
    "network": "celo"
  }
}`,
    curlExample: `# Step 1: Initial request (will get 402)
curl -X POST ${BASE_URL}/api/verification \\
  -H "Content-Type: application/json" \\
  -d '{
    "userAddress": "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
    "level": "standard",
    "webhookUrl": "https://my-agent.xyz/kyc-callback"
  }'

# Step 2: Pay via x402 and retry
# Use the x402-fetch library for automatic payment handling:
# npm install x402-fetch`,
  },
  {
    id: "check-status",
    method: "GET",
    path: "/api/verification?id=xxx",
    description:
      "Check the status of an existing verification session by its session ID. Poll this endpoint to monitor progress.",
    responseBody: `{
  "sessionId": "kyc_x7k2m9p4n1q8r3s5",
  "status": "completed",
  "level": "standard",
  "userAddress": "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
  "attestationHash": "0xa3f8e2b1c4d9f6a0b7e3c5d8f1a2b4c6d0e7f9a1b3c5d7e9f2a4b6c8d0e2f4a6",
  "createdAt": "2026-03-18T03:01:00Z",
  "expiresAt": "2026-03-18T03:31:00Z"
}

// status values:
// "pending"   - waiting for user to verify
// "completed" - verified, attestation on-chain
// "failed"    - verification failed or rejected
// "expired"   - session timed out (30 min)`,
    curlExample: `curl "${BASE_URL}/api/verification?id=kyc_x7k2m9p4n1q8r3s5"`,
  },
  {
    id: "check-user",
    method: "GET",
    path: "/api/verification?userAddress=0x...",
    description:
      "Check if a user has a valid on-chain KYC attestation. Returns their current verification status and level. Useful for pre-checking before requesting new verification.",
    responseBody: `{
  "userAddress": "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf",
  "isVerified": true,
  "level": "standard",
  "attestationHash": "0xa3f8e2b1c4d9f6a0b7e3c5d8f1a2b4c6d0e7f9a1b3c5d7e9f2a4b6c8d0e2f4a6",
  "issuedAt": "2026-03-18T03:01:42Z",
  "expiresAt": "2027-03-18T03:01:42Z",
  "network": "celo-sepolia"
}

// If no attestation exists:
{
  "userAddress": "0xDeadBeef...",
  "isVerified": false,
  "level": null,
  "message": "No attestation found for this address"
}`,
    curlExample: `curl "${BASE_URL}/api/verification?userAddress=0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf"`,
  },
  {
    id: "callback",
    method: "POST",
    path: "/api/verification/{id}/callback",
    description:
      "Self Protocol webhook endpoint. Called automatically when a user completes the ZK proof verification. Do not call this directly in production — it is triggered by the Self Protocol backend. In demo mode, POST with { demo: true } to simulate a completed verification.",
    requestBody: `// Production (called by Self Protocol):
{
  "proof": "eyJhbGciOiJSUzI1NiJ9...",
  "publicSignals": ["1", "0", "1", "..."],
  "sessionId": "kyc_x7k2m9p4n1q8r3s5"
}

// Demo mode:
{
  "demo": true
}`,
    responseBody: `{
  "success": true,
  "verificationId": "kyc_x7k2m9p4n1q8r3s5",
  "level": "standard",
  "attestationHash": "0xa3f8e2b1c4d9f6a0b7e3c5d8f1a2b4c6d0e7f9a1b3c5d7e9f2a4b6c8d0e2f4a6",
  "result": {
    "isVerified": true,
    "isHuman": true,
    "isAdult": true,
    "nationality": "CA",
    "nullifier": "0xb4c7d0e3f6a9b2c5...",
    "demoMode": false
  }
}`,
    curlExample: `# Demo mode — simulate completed verification:
curl -X POST ${BASE_URL}/api/verification/kyc_x7k2m9p4n1q8r3s5/callback \\
  -H "Content-Type: application/json" \\
  -d '{"demo": true}'`,
    notes:
      "In production, this endpoint verifies the ZK-SNARK proof from Self Protocol and issues an EAS attestation on Celo — reusable for 7–90 days depending on tier.",
  },
  {
    id: "stats",
    method: "GET",
    path: "/api/stats",
    description:
      "Get aggregate statistics about the KYC Gateway — total verifications, by level, network activity, and fee revenue.",
    responseBody: `{
  "totalVerifications": 1247,
  "byLevel": {
    "basic": 891,
    "standard": 298,
    "enhanced": 58
  },
  "last24h": 42,
  "last7d": 213,
  "totalRevenue": {
    "amount": "1892.50",
    "currency": "cUSD"
  },
  "network": "celo-sepolia",
  "demoMode": true,
  "uptime": "99.9%"
}`,
    curlExample: `curl "${BASE_URL}/api/stats"`,
  },
];

const x402IntegrationCode = `import { withPaymentInterceptor } from "x402-fetch";

// Wrap fetch with x402 auto-payment
const fetch = withPaymentInterceptor(globalThis.fetch, {
  walletPrivateKey: process.env.AGENT_PRIVATE_KEY, // cUSD balance needed
  network: "celo",
});

// This will:
// 1. Make initial request
// 2. Handle 402 automatically (pay $1.50 cUSD)
// 3. Retry with X-PAYMENT header
// 4. Return successful response
const response = await fetch("${BASE_URL}/api/verification", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userAddress: userWalletAddress,
    level: "standard",
    webhookUrl: "https://your-agent.xyz/kyc-webhook",
  }),
});

const { sessionId, verifyUrl } = await response.json();
// Send verifyUrl to user via email, Telegram, etc.`;

const agentIntegrationCode = `// Complete agent workflow — request KYC and monitor
async function requestKYC(userAddress: string) {
  // 1. Request verification (auto-pays via x402)
  const res = await fetch("${BASE_URL}/api/verification", {
    method: "POST",
    body: JSON.stringify({ userAddress, level: "standard" }),
    headers: { "Content-Type": "application/json" },
  });
  const { sessionId, verifyUrl } = await res.json();
  
  // 2. Send verify link to user
  await sendToUser(verifyUrl);
  
  // 3. Poll for completion
  let verified = false;
  while (!verified) {
    await sleep(5000);
    const status = await fetch(
      \`${BASE_URL}/api/verification?id=\${sessionId}\`
    ).then(r => r.json());
    
    if (status.status === "completed") {
      verified = true;
      console.log("User verified!", status.attestationHash);
    }
  }
}

// Or use webhooks (recommended)
// POST webhookUrl receives: { event: "verification.completed", attestationHash }`;

const sdkCode = `// npm install @kyc-gateway/sdk (coming soon)
import { KYCGateway } from "@kyc-gateway/sdk";

const gateway = new KYCGateway({
  apiKey: process.env.KYC_GATEWAY_KEY,
  agentAddress: process.env.AGENT_ADDRESS,
  network: "celo",
});

// Simple one-liner
const result = await gateway.verify(userAddress, "standard");

if (result.isVerified) {
  console.log("✅ User verified on Celo:", result.attestationHash);
}`;

const methodConfig = {
  GET: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  POST: "bg-[#35D07F]/15 text-[#35D07F] border-[#35D07F]/30",
};

export default function DocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState(endpoints[0].id);

  const active = endpoints.find((e) => e.id === activeEndpoint)!;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="badge badge-green text-xs">📖 REST API</span>
              <span className="badge badge-yellow text-xs">x402 Payments</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              API{" "}
              <span className="gradient-text">Documentation</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Full reference for the KYC Gateway REST API. All endpoints support
              HTTPS and return JSON.
            </p>
          </div>

          {/* Base URL */}
          <div className="glass-card rounded-2xl p-4 mb-8 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium whitespace-nowrap">
              Base URL
            </span>
            <code className="text-[#35D07F] font-mono text-sm bg-[#35D07F]/5 px-3 py-1 rounded-lg border border-[#35D07F]/20 flex-1">
              {BASE_URL}
            </code>
            <span className="badge badge-yellow text-xs whitespace-nowrap">
              💸 x402 Required
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar — endpoint list */}
            <div className="lg:col-span-1">
              <div className="glass-card rounded-2xl overflow-hidden sticky top-24">
                <div className="px-4 py-3 border-b border-gray-800">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                    Endpoints
                  </p>
                </div>
                <nav className="p-2">
                  {endpoints.map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => setActiveEndpoint(ep.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors mb-1 ${
                        activeEndpoint === ep.id
                          ? "bg-[#35D07F]/10 border border-[#35D07F]/20"
                          : "hover:bg-gray-800/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            methodConfig[ep.method]
                          }`}
                        >
                          {ep.method}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono ${
                          activeEndpoint === ep.id
                            ? "text-[#35D07F]"
                            : "text-gray-400"
                        }`}
                      >
                        {ep.path.length > 28
                          ? ep.path.slice(0, 28) + "..."
                          : ep.path}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Endpoint header */}
              <div className="glass-card rounded-2xl p-6">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span
                    className={`text-sm font-bold px-3 py-1 rounded-lg border ${
                      methodConfig[active.method]
                    }`}
                  >
                    {active.method}
                  </span>
                  <code className="text-white font-mono text-sm bg-gray-800 px-3 py-1 rounded-lg">
                    {active.path}
                  </code>
                </div>
                <p className="text-gray-300 leading-relaxed">
                  {active.description}
                </p>
                {active.notes && (
                  <div className="mt-4 p-3 bg-[#FCFF52]/5 border border-[#FCFF52]/20 rounded-xl">
                    <p className="text-[#FCFF52] text-xs font-medium mb-1">
                      📝 Note
                    </p>
                    <p className="text-gray-400 text-sm">{active.notes}</p>
                  </div>
                )}
              </div>

              {/* Request body */}
              {active.requestBody && (
                <div>
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#35D07F]" />
                    Request Body
                  </h3>
                  <CodeBlock
                    code={active.requestBody}
                    language="json"
                    title="Request Body"
                  />
                </div>
              )}

              {/* Response body */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Response
                </h3>
                <CodeBlock
                  code={active.responseBody}
                  language="json"
                  title="Response (200 OK)"
                />
              </div>

              {/* cURL example */}
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#FCFF52]" />
                  cURL Example
                </h3>
                <CodeBlock
                  code={active.curlExample}
                  language="bash"
                  title="Terminal"
                />
              </div>
            </div>
          </div>

          {/* Integration guides */}
          <div className="mt-12">
            <h2 className="text-2xl font-black text-white mb-6 text-center">
              Integration{" "}
              <span className="gradient-text">Guides</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="badge badge-yellow text-xs">x402</span>
                  Auto-Payment with x402
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Use the x402-fetch library to handle payments automatically.
                  No manual payment logic needed.
                </p>
                <CodeBlock
                  code={x402IntegrationCode}
                  language="typescript"
                  title="x402-integration.ts"
                />
              </div>

              <div>
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <span className="badge badge-green text-xs">🤖 Agent</span>
                  Full Agent Workflow
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  Complete example: request verification, notify user, and poll
                  for completion or receive webhook.
                </p>
                <CodeBlock
                  code={agentIntegrationCode}
                  language="typescript"
                  title="agent-workflow.ts"
                />
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                <span className="badge badge-blue text-xs">Coming Soon</span>
                SDK (TypeScript/Python)
              </h3>
              <CodeBlock
                code={sdkCode}
                language="typescript"
                title="@kyc-gateway/sdk"
              />
            </div>
          </div>

          {/* Pricing table */}
          <div className="mt-12">
            <h2 className="text-2xl font-black text-white mb-6 text-center">
              Pricing
            </h2>
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-6 py-4 text-xs text-gray-500 uppercase tracking-wider font-medium">
                      Level
                    </th>
                    <th className="text-left px-4 py-4 text-xs text-gray-500 uppercase tracking-wider font-medium">
                      Fee (cUSD)
                    </th>
                    <th className="text-left px-4 py-4 text-xs text-gray-500 uppercase tracking-wider font-medium hidden sm:table-cell">
                      Checks
                    </th>
                    <th className="text-left px-4 py-4 text-xs text-gray-500 uppercase tracking-wider font-medium hidden md:table-cell">
                      Best For
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {[
                    {
                      level: "basic",
                      fee: "$0.25",
                      checks: "Humanity proof, phone",
                      for: "Bot prevention, basic KYC",
                      color: "text-blue-400",
                    },
                    {
                      level: "standard",
                      fee: "$1.50",
                      checks: "Govt ID, nationality, age 18+",
                      for: "DeFi, DAO governance, lending",
                      color: "text-[#35D07F]",
                    },
                    {
                      level: "enhanced",
                      fee: "$5.00",
                      checks: "Biometric, sanctions, AML",
                      for: "Regulated finance, high-value tx",
                      color: "text-[#FCFF52]",
                    },
                  ].map((row) => (
                    <tr key={row.level} className="hover:bg-gray-800/20">
                      <td className="px-6 py-4">
                        <span className={`font-semibold capitalize ${row.color}`}>
                          {row.level}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono font-bold text-white">
                        {row.fee}
                      </td>
                      <td className="px-4 py-4 text-gray-400 hidden sm:table-cell text-xs">
                        {row.checks}
                      </td>
                      <td className="px-4 py-4 text-gray-500 hidden md:table-cell text-xs">
                        {row.for}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
