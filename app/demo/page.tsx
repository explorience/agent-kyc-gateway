"use client";

import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StepWizard from "@/components/StepWizard";
import CodeBlock from "@/components/CodeBlock";

const DEMO_AGENT_ADDRESS = "0x3fA8B653F9abf91428800C8bB0AB9d8fE8c7A8c3";
const DEMO_USER_ADDRESS = "0x7E5F4552091A69125d5DfCb7b8C2659029395Bdf";
const DEMO_TX_HASH = "0xa3f8e2b1c4d9f6a0b7e3c5d8f1a2b4c6d0e7f9a1b3c5d7e9f2a4b6c8d0e2f4a6";
const DEMO_SESSION_ID = "kyc_x7k2m9p4n1q8r3s5";
const DEMO_ATTESTATION_HASH = "0xb9c4f2a7e1d8b3c6f0a4e2d7b1c5f3a8e6d2b0c4f7a1e5d9b3c7f2a0e4d8b6c1";

const steps = [
  { id: 1, label: "API Request" },
  { id: 2, label: "x402 Payment" },
  { id: 3, label: "ID Verify" },
  { id: 4, label: "Attestation" },
];

const apiRequestCode = `POST https://knowyourhuman.xyz/api/verification
Content-Type: application/json
Authorization: Bearer <agent_api_key>

{
  "userAddress": "${DEMO_USER_ADDRESS}",
  "agentAddress": "${DEMO_AGENT_ADDRESS}",
  "level": "standard",
  "webhookUrl": "https://my-agent.xyz/kyc-callback"
}`;

const x402ResponseCode = `HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": "1",
  "error": "X-PAYMENT header required",
  "accepts": [{
    "scheme": "exact",
    "network": "celo",
    "maxAmountRequired": "1500000",
    "resource": "https://knowyourhuman.xyz/api/verification",
    "description": "Standard KYC verification fee",
    "mimeType": "application/json",
    "payTo": "0xKYCGateway...",
    "maxTimeoutSeconds": 300,
    "asset": "0x765DE816845861e75A25fCA122bb6898B8B1282a"
  }]
}`;

const x402PaymentCode = `// Agent auto-pays using x402 library
import { withPaymentInterceptor } from "x402-fetch";

const fetch = withPaymentInterceptor(globalThis.fetch, {
  walletPrivateKey: process.env.AGENT_PRIVATE_KEY,
  network: "celo"
});

// Agent retries with automatic payment
const response = await fetch(
  "https://knowyourhuman.xyz/api/verification",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userAddress: "${DEMO_USER_ADDRESS}",
      level: "standard"
    })
  }
);

// Returns: { sessionId: "${DEMO_SESSION_ID}", verifyUrl: "..." }`;

const paymentSuccessCode = `HTTP/1.1 200 OK
X-PAYMENT-RESPONSE: eyJzdWNjZXNzIjp0cnVlLCJ0eEhhc2giOi...

{
  "sessionId": "${DEMO_SESSION_ID}",
  "status": "pending",
  "level": "standard",
  "verifyUrl": "https://knowyourhuman.xyz/verify/${DEMO_SESSION_ID}",
  "expiresAt": "2026-03-18T04:01:00Z",
  "paymentTxHash": "0xc7f1e3a2b4d6f8a0c2e4b6d8f0a2c4e6...",
  "fee": {
    "amount": "1.50",
    "currency": "cUSD",
    "network": "celo"
  }
}`;

const selfQrData = JSON.stringify(
  {
    appId: "KYC_GATEWAY_SELF_PROTOCOL",
    sessionId: DEMO_SESSION_ID,
    userAddress: DEMO_USER_ADDRESS,
    scope: ["humanity_proof", "nationality", "age_18_plus"],
    callbackUrl: `https://knowyourhuman.xyz/api/verification/${DEMO_SESSION_ID}/callback`,
    network: "celo",
  },
  null,
  2
);

const attestationCode = `// EAS attestation issued on Celo
{
  "verificationId": "${DEMO_SESSION_ID}",
  "status": "completed",
  "level": "standard",
  "userAddress": "${DEMO_USER_ADDRESS}",
  "attestation": {
    "uid": "${DEMO_ATTESTATION_HASH}",
    "network": "celo-alfajores",
    "easContract": "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92",
    "issuedAt": "2026-03-21T14:00:00Z",
    "expiresAt": "2026-05-20T14:00:00Z",
    "validityDays": 60,
    "easScanUrl": "https://celo.easscan.org/attestation/view/0xb9c4..."
  },
  "providerResults": {
    "overallSuccess": true,
    "totalChecks": 3,
    "passedChecks": 3,
    "providers": [
      { "provider": "human-passport", "success": true,
        "checks": ["document", "liveness", "face-match"] }
    ]
  }
}`;

const webhookCode = `POST https://my-agent.xyz/kyc-callback
Content-Type: application/json
X-KYC-SIGNATURE: sha256=...

{
  "event": "verification.completed",
  "verificationId": "${DEMO_SESSION_ID}",
  "userAddress": "${DEMO_USER_ADDRESS}",
  "level": "standard",
  "attestationHash": "${DEMO_ATTESTATION_HASH}",
  "timestamp": "2026-03-18T03:01:42Z"
}`;

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [autoAdvancing, setAutoAdvancing] = useState(false);
  const [stepComplete, setStepComplete] = useState<Record<number, boolean>>({});
  const [showQR, setShowQR] = useState(false);
  const [qrPixels] = useState(() =>
    Array.from({ length: 196 }, () => Math.random() > 0.45)
  );
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const advanceStep = () => {
    setStepComplete((prev) => ({ ...prev, [currentStep]: true }));
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleSimulateVerification = async () => {
    setVerifying(true);
    await new Promise((r) => setTimeout(r, 2000));
    setVerified(true);
    setVerifying(false);
    await new Promise((r) => setTimeout(r, 800));
    advanceStep();
  };

  // Show QR code on step 3
  useEffect(() => {
    if (currentStep === 3) {
      const t = setTimeout(() => setShowQR(true), 400);
      return () => clearTimeout(t);
    }
  }, [currentStep]);

  const stepContent: Record<number, React.ReactNode> = {
    1: (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl">
              🤖
            </div>
            <div>
              <h3 className="text-white font-semibold">Agent Requests KYC</h3>
              <p className="text-gray-400 text-sm">
                Your AI agent calls the KYC Gateway REST API
              </p>
            </div>
          </div>
          <CodeBlock
            code={apiRequestCode}
            language="http"
            title="POST /api/verification"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">🔐</div>
            <div className="text-white font-medium text-sm">Zero PII</div>
            <div className="text-gray-500 text-xs mt-1">
              Only wallet addresses used
            </div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">⚡</div>
            <div className="text-white font-medium text-sm">Sub-second</div>
            <div className="text-gray-500 text-xs mt-1">API response time</div>
          </div>
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-2">🌐</div>
            <div className="text-white font-medium text-sm">
              Any Language
            </div>
            <div className="text-gray-500 text-xs mt-1">REST API standard</div>
          </div>
        </div>

        <button onClick={advanceStep} className="btn-primary w-full justify-center py-3">
          Next: x402 Payment →
        </button>
      </div>
    ),

    2: (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#FCFF52]/10 border border-[#FCFF52]/30 flex items-center justify-center text-xl">
              💸
            </div>
            <div>
              <h3 className="text-white font-semibold">x402 Micropayment</h3>
              <p className="text-gray-400 text-sm">
                Gateway returns 402, agent pays $1.50 cUSD automatically
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                1. Gateway Returns 402
              </p>
              <CodeBlock
                code={x402ResponseCode}
                language="http"
                title="402 Payment Required"
              />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                2. Agent Auto-Pays via x402
              </p>
              <CodeBlock
                code={x402PaymentCode}
                language="typescript"
                title="agent-pays.ts"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
              3. Payment Verified, Session Created
            </p>
            <CodeBlock
              code={paymentSuccessCode}
              language="json"
              title="200 OK — Session Created"
            />
          </div>
        </div>

        <div
          className="rounded-2xl p-4 border"
          style={{
            background: "rgba(252, 255, 82, 0.05)",
            borderColor: "rgba(252, 255, 82, 0.2)",
          }}
        >
          <p className="text-[#FCFF52] text-sm font-medium mb-1">
            💡 Why x402?
          </p>
          <p className="text-gray-400 text-sm">
            x402 is a new HTTP payment protocol — agents pay in a single
            round-trip without wallets, UX prompts, or escrow. It&apos;s the
            native payment layer for the agentic web.
          </p>
        </div>

        <button onClick={advanceStep} className="btn-primary w-full justify-center py-3">
          Next: User Verifies Identity →
        </button>
      </div>
    ),

    3: (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#35D07F]/10 border border-[#35D07F]/30 flex items-center justify-center text-xl">
            📱
          </div>
          <div>
            <h3 className="text-white font-semibold">Human Verifies Identity</h3>
            <p className="text-gray-400 text-sm">
              Verification fan-out: providers run in parallel, ZK proofs generated on-device
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Code */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-5 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-medium">
              Self Protocol QR Code
            </p>
            <div
              className={`w-44 h-44 mx-auto bg-white rounded-xl p-2 transition-all duration-500 ${
                showQR ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
            >
              <div className="w-full h-full grid gap-0.5" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
                {qrPixels.map((filled, i) => (
                  <div
                    key={i}
                    className={`rounded-[1px] ${filled ? "bg-gray-900" : "bg-white"}`}
                  />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3 font-mono">
              Session: {DEMO_SESSION_ID}
            </p>

            {!verified && (
              <button
                onClick={handleSimulateVerification}
                disabled={verifying}
                className="mt-4 w-full py-2.5 bg-[#35D07F] text-[#0a0a0a] font-semibold rounded-xl hover:bg-[#2db86e] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 text-sm"
              >
                {verifying ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                    Generating ZK Proof...
                  </>
                ) : (
                  "✨ Simulate Passport Scan"
                )}
              </button>
            )}

            {verified && (
              <div className="mt-4 py-2.5 bg-[#35D07F]/10 border border-[#35D07F]/30 rounded-xl text-[#35D07F] text-sm font-medium">
                ✅ ZK Proof Generated!
              </div>
            )}
          </div>

          {/* QR data / steps */}
          <div className="space-y-3">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
                QR Payload
              </p>
              <pre className="text-xs text-gray-400 font-mono overflow-x-auto whitespace-pre-wrap break-all">
                {selfQrData}
              </pre>
            </div>

            <div className="space-y-2">
              {[
                { done: true, label: "QR scanned by Self app" },
                { done: true, label: "NFC chip read from passport" },
                { done: verified, label: "ZK-SNARK proof generated on device" },
                { done: false, label: "Proof submitted to gateway" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                      item.done
                        ? "bg-[#35D07F] text-[#0a0a0a]"
                        : "bg-gray-800 text-gray-600 border border-gray-700"
                    }`}
                  >
                    {item.done ? "✓" : "·"}
                  </div>
                  <span className={item.done ? "text-gray-300" : "text-gray-600"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),

    4: (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#35D07F]/10 border border-[#35D07F]/30 flex items-center justify-center text-xl">
            ⛓️
          </div>
          <div>
            <h3 className="text-white font-semibold">
              Attestation On-Chain
            </h3>
            <p className="text-gray-400 text-sm">
              ZK proofs verified, EAS attestation issued on Celo — valid 60 days
            </p>
          </div>
        </div>

        {/* Success banner */}
        <div
          className="rounded-2xl p-5 border text-center"
          style={{
            background: "rgba(53, 208, 127, 0.08)",
            borderColor: "rgba(53, 208, 127, 0.3)",
          }}
        >
          <div className="text-5xl mb-3 animate-bounce">🎉</div>
          <h3 className="text-white font-bold text-xl mb-2">
            Verification Complete!
          </h3>
          <p className="text-gray-300 text-sm mb-4">
            Identity verified, ZK proof valid, attestation recorded on Celo
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-4">
            <span className="badge badge-green">✅ Humanity Proof</span>
            <span className="badge badge-green">✅ Age 18+</span>
            <span className="badge badge-green">✅ Nationality Verified</span>
          </div>

          <div className="bg-[#0a0a0a]/60 rounded-xl p-3 text-left">
            <p className="text-xs text-gray-500 mb-1 font-mono">
              Attestation TX:
            </p>
            <a
              href={`https://celo-sepolia.celoscan.io/tx/${DEMO_ATTESTATION_HASH}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#35D07F] text-xs font-mono hover:underline break-all"
            >
              {DEMO_ATTESTATION_HASH}
            </a>
            <p className="text-xs text-gray-600 mt-1">
              ↗ View on EAS Scan (celo.easscan.org)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
              Attestation Response
            </p>
            <CodeBlock
              code={attestationCode}
              language="json"
              title="Verification Complete"
            />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
              Webhook to Agent
            </p>
            <CodeBlock
              code={webhookCode}
              language="http"
              title="POST /kyc-callback"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setCurrentStep(1);
              setStepComplete({});
              setShowQR(false);
              setVerified(false);
              setVerifying(false);
              setAutoAdvancing(false);
            }}
            className="btn-secondary flex-1 justify-center py-3 text-center"
          >
            ↩ Restart Demo
          </button>
          <a
            href="/explorer"
            className="btn-primary flex-1 justify-center py-3 text-center"
          >
            View Explorer →
          </a>
        </div>
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Page header */}
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="badge badge-green text-xs">🚀 Live Demo</span>
              <span className="badge badge-blue text-xs">Celo Sepolia</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
              Interactive{" "}
              <span className="gradient-text">KYC Flow</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto">
              Walk through the full verification flow — from agent API request
              to on-chain attestation.
            </p>
          </div>

          {/* Addresses bar */}
          <div className="glass-card rounded-2xl p-4 mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
                🤖 Agent Address
              </p>
              <p className="text-white font-mono text-xs break-all">
                {DEMO_AGENT_ADDRESS}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1 font-medium">
                👤 User Address
              </p>
              <p className="text-white font-mono text-xs break-all">
                {DEMO_USER_ADDRESS}
              </p>
            </div>
          </div>

          {/* Step wizard */}
          <div className="glass-card rounded-2xl p-6 mb-6">
            <StepWizard steps={steps} currentStep={currentStep} />
          </div>

          {/* Step content */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 min-h-[400px]">
            <div key={currentStep} className="animate-fade-in-up">
              {stepContent[currentStep]}
            </div>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
            <span>
              Step {currentStep} of {steps.length}
            </span>
            <span className="font-mono text-xs">
              {Object.values(stepComplete).filter(Boolean).length}/{steps.length} complete
            </span>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
