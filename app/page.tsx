import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnimatedDiagram from "@/components/AnimatedDiagram";
import VerificationCard from "@/components/VerificationCard";

const howItWorks = [
  {
    step: "01",
    title: "Agent or dApp Requests Verification",
    desc: "An AI agent (identified via ERC-8004) or dApp calls the KYH API with a wallet address and desired tier. No API keys needed — the wallet IS the identity.",
    icon: "🤖",
  },
  {
    step: "02",
    title: "x402 Micropayment in cUSD",
    desc: "KYH returns a 402 Payment Required response. The caller pays automatically in cUSD on Celo. No invoices, no sign-ups, no minimums.",
    icon: "💳",
  },
  {
    step: "03",
    title: "Human Verifies Once",
    desc: "The human receives a verification link. Depending on tier: check onchain activity (Reputation), scan passport NFC via Self Protocol (Document), or complete liveness + face match via Didit (Biometric/Full KYC). Takes 5–120 seconds.",
    icon: "📱",
  },
  {
    step: "04",
    title: "EAS Attestation Issued on Celo",
    desc: "KYH issues an EAS attestation to the human's wallet — valid for 90 days. Any agent or dApp reads it for free with a single contract call. Your identity follows you to Celo.",
    icon: "📜",
  },
];

const techBadges = [
  { label: "Celo", color: "badge-green", icon: "🟡" },
  { label: "Self Protocol", color: "badge-blue", icon: "🔐" },
  { label: "Human Passport", color: "badge-green", icon: "🛂" },
  { label: "Didit", color: "badge-blue", icon: "🪪" },
  { label: "x402", color: "badge-yellow", icon: "💸" },
  { label: "ZK-SNARKs", color: "badge-green", icon: "⚡" },
  { label: "EAS", color: "badge-blue", icon: "📜" },
  { label: "ERC-8004", color: "badge-yellow", icon: "🤖" },
];

const useCases = [
  {
    icon: "💸",
    title: "Cross-Border Remittance",
    desc: "Agent sends cUSD internationally. Remittance dApp requires sender identity. KYH verifies once — all future transfers clear instantly.",
  },
  {
    icon: "🏦",
    title: "Micro-Lending",
    desc: "Lending protocol needs proof of unique humanity before issuing a loan. Starter tier works without a passport — phone + social proof is enough.",
  },
  {
    icon: "🗳️",
    title: "Governance & Quadratic Funding",
    desc: "DAO voting or Gitcoin-style rounds need one-person-one-vote guarantees. KYH Basic or Standard provides sybil-resistant proof of personhood.",
  },
  {
    icon: "🔒",
    title: "Regulated DeFi Pools",
    desc: "Some liquidity pools require KYC for AML compliance. Enhanced tier provides full biometric + sanctions screening with a 90-day reusable credential.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      {/* Hero section */}
      <section className="pt-32 sm:pt-40 pb-16 sm:pb-24 px-6 sm:px-8 lg:px-12 relative overflow-hidden">
        <div
          className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #35D07F 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-40 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(circle, #FCFF52 0%, transparent 70%)",
          }}
        />

        <div className="w-full max-w-4xl mx-auto text-center relative z-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="badge badge-green text-xs">
              🏆 Celo Hackathon 2026
            </span>
            <span className="badge badge-blue text-xs">
              Testnet Live
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
            Know Your Human
            <br />
            <span className="gradient-text">KYC for the Celo Ecosystem</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-4 leading-relaxed">
            The first identity verification API built for AI agents and dApps on Celo.
            Verify once. Credential lives on-chain for 90 days.{" "}
            <strong className="text-white">Any agent reads the credential for free.</strong>
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Your identity follows you to Celo. Agents pay via{" "}
            <strong className="text-white">x402</strong> in cUSD — no API keys, no sign-ups.
            Credentials issued as{" "}
            <strong className="text-white">EAS attestations</strong> on Celo.
            From <strong className="text-gray-300">free</strong> to{" "}
            <strong className="text-gray-300">$0.75</strong> per verification. Zero PII stored.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/demo" className="btn-primary text-base px-6 py-3">
              🚀 Try Live Demo
            </Link>
            <Link href="/docs" className="btn-secondary text-base px-6 py-3">
              View API Docs
            </Link>
          </div>

          {/* For Agents box */}
          <div className="glass-card rounded-xl p-4 sm:p-5 max-w-2xl mx-auto mb-12 sm:mb-16 border border-[#35D07F]/20 bg-[#35D07F]/5">
            <div className="flex items-start gap-3">
              <span className="text-xl">🤖</span>
              <div className="text-left">
                <p className="text-sm font-semibold text-white mb-1">For AI Agents</p>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Check a wallet:{" "}
                  <code className="text-[#35D07F] bg-black/30 px-1.5 py-0.5 rounded text-xs">
                    GET /api/check/0xABC...
                  </code>
                  {" "}— free, no auth. Download the{" "}
                  <a href="/skill.md" className="text-[#35D07F] underline underline-offset-2 hover:text-white">
                    agent skill file
                  </a>
                  {" "}for complete integration instructions, or read the{" "}
                  <Link href="/docs" className="text-[#35D07F] underline underline-offset-2 hover:text-white">
                    API docs
                  </Link>.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 max-w-4xl mx-auto">
            <p className="text-xs text-gray-500 uppercase tracking-widest mb-4 text-center font-semibold">
              Verification Flow
            </p>
            <AnimatedDiagram />
          </div>
        </div>
      </section>

      {/* Pricing tiers */}
      <section className="py-16 sm:py-24 px-6 sm:px-8 lg:px-12" id="pricing">
        <div className="w-full max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
              Four Tiers.{" "}
              <span className="gradient-text">One API.</span>
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
              Pay per verification in cUSD on Celo. No subscriptions, no minimums.
              Reputation tier is free. Agents with Self Agent ID get 20% off.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            <VerificationCard
              tier="reputation"
              price="Free"
              features={[
                "Onchain activity scoring",
                "Social presence analysis",
                "Basic sybil resistance",
                "No documents required",
                "EAS credential on Celo",
                "90-day validity",
              ]}
            />
            <VerificationCard
              tier="document"
              price="$0.01"
              features={[
                "NFC passport chip scan",
                "ZK-SNARK proof generated",
                "Age + nationality derived",
                "No biometrics needed",
                "EAS credential on Celo",
                "90-day validity",
              ]}
            />
            <VerificationCard
              tier="biometric"
              price="$0.25"
              features={[
                "Gov ID document scan",
                "Liveness detection",
                "Face match verification",
                "IP analysis (VPN/proxy check)",
                "EAS credential on Celo",
                "90-day validity",
              ]}
              highlighted={true}
            />
            <VerificationCard
              tier="fullkyc"
              price="$0.75"
              features={[
                "ZK passport proof (Self)",
                "Biometric liveness (Didit)",
                "AML/sanctions screening",
                "IP analysis included",
                "EAS credential on Celo",
                "90-day validity",
              ]}
            />
          </div>

          {/* Verify once callout */}
          <div className="mt-14 rounded-2xl p-8 border border-[#35D07F]/20 bg-[#35D07F]/5 max-w-3xl mx-auto text-center">
            <p className="text-sm text-[#35D07F] font-semibold mb-1">✨ Verify Once. Read Forever.</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              The first verification costs <strong className="text-white">$0.001–$0.75</strong> depending on tier.
              After that, the EAS credential is free to read for any agent or dApp — forever.
              No recurring fees. No subscriptions. <strong className="text-white">Pure public good.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-6 sm:px-8 lg:px-12 bg-gradient-to-b from-transparent to-[#0d1117]/50" id="how">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
              Verify once. Reuse forever. Any agent or dApp checks the credential with a single contract call.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {howItWorks.map((step) => (
              <div
                key={step.step}
                className="glass-card rounded-2xl p-8 flex gap-5"
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-[#35D07F]/10 border border-[#35D07F]/30 flex items-center justify-center text-xl flex-shrink-0">
                    {step.icon}
                  </div>
                  <div className="text-xs font-mono text-[#35D07F] mt-2 opacity-60">
                    {step.step}
                  </div>
                </div>
                <div>
                  <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ERC-8004 */}
      <section className="py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-3xl mx-auto">
          <div className="glass-card rounded-3xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0 text-5xl">🤖</div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-black text-white mb-4">
                  Built for the <span className="gradient-text">Agentic Web</span>
                </h2>
                <p className="text-gray-400 leading-relaxed mb-4">
                  Agents prove they&apos;re human-backed via{" "}
                  <strong className="text-white">Self Agent ID</strong> — zero-knowledge proof
                  that a real person operates the agent. dApps identify by wallet address.
                  Both pay via x402 in cUSD.
                </p>
                <p className="text-gray-400 leading-relaxed mb-4">
                  No API keys. No sign-ups. No dashboards. The wallet IS the identity.
                </p>
                <div className="flex flex-col gap-3 mt-6">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#35D07F]/5 border border-[#35D07F]/20">
                    <span className="text-sm">⛓️</span>
                    <span className="text-sm text-gray-300">
                      KYH is registered as <strong className="text-[#35D07F]">ERC-8004 Agent #24212</strong> on Base
                    </span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FCFF52]/5 border border-[#FCFF52]/20">
                    <span className="text-sm">💰</span>
                    <span className="text-sm text-gray-300">
                      Agents with <strong className="text-[#FCFF52]">Self Agent ID</strong> get 20% off all verification fees
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 sm:py-24 px-6 sm:px-8 lg:px-12" id="use-cases">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
              Real <span className="gradient-text">Use Cases</span>
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
              Anywhere an agent or dApp needs to know: is this wallet a verified human?
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {useCases.map((uc) => (
              <div key={uc.title} className="glass-card rounded-2xl p-8">
                <div className="text-3xl mb-3">{uc.icon}</div>
                <h3 className="text-white font-semibold mb-2">{uc.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech stack */}
      <section className="py-16 sm:py-20 px-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-3xl mx-auto text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-2 font-semibold">
            Powered By
          </p>
          <p className="text-sm text-gray-500 mb-6 italic">
            Your identity follows you to Celo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {techBadges.map((badge) => (
              <span key={badge.label} className={`badge ${badge.color} text-sm px-4 py-2`}>
                {badge.icon} {badge.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-6 sm:px-8 lg:px-12">
        <div className="w-full max-w-3xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
            style={{
              background:
                "linear-gradient(135deg, rgba(53, 208, 127, 0.15) 0%, rgba(252, 255, 82, 0.05) 100%)",
              border: "1px solid rgba(53, 208, 127, 0.3)",
            }}
          >
            <div className="text-5xl mb-6 animate-float">🤖</div>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-4">
              KYC for the Agentic Web
            </h2>
            <p className="text-gray-300 mb-2 max-w-xl mx-auto leading-relaxed">
              As AI agents gain autonomy and handle real-world transactions,
              identity verification becomes critical infrastructure.
            </p>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
              Know Your Human makes it seamless — one API, four tiers, credentials
              that travel with your wallet for 90 days. Agents pay. Humans verify once. Everyone benefits.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/demo" className="btn-primary text-base px-6 py-3">
                🚀 Try the Demo
              </Link>
              <a
                href="https://github.com/explorience/know-your-human"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary text-base px-6 py-3"
              >
                ⭐ Star on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
