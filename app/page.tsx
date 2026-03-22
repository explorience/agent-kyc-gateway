import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnimatedDiagram from "@/components/AnimatedDiagram";
import VerificationCard from "@/components/VerificationCard";

const howItWorks = [
  {
    step: "01",
    title: "Agent or dApp Requests Verification",
    desc: "An AI agent or dApp calls the KYH API with a wallet address and desired tier. Payment is made automatically via x402 — as little as $0.001 cUSD.",
    icon: "🤖",
  },
  {
    step: "02",
    title: "x402 Micropayment in cUSD",
    desc: "The gateway issues a 402 Payment Required response. The agent pays automatically in cUSD on Celo. No invoices, no contracts, no minimums.",
    icon: "💳",
  },
  {
    step: "03",
    title: "Human Verifies Once",
    desc: "The human receives a verification link. Depending on tier: tap passport NFC chip, complete a liveness check, or simply confirm their phone number. Takes 5–120 seconds.",
    icon: "📱",
  },
  {
    step: "04",
    title: "EAS Credential Issued on Celo",
    desc: "KYH issues an EAS attestation to the human's wallet — valid for 7–90 days. Any agent or dApp can now check that credential instantly, for free, via a single contract call.",
    icon: "⛓️",
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
      <section className="pt-40 pb-24 px-4 sm:px-6 relative overflow-hidden">
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

        <div className="w-full max-w-5xl mx-auto text-center relative z-10 px-2">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="badge badge-green text-xs">
              🏆 Celo Hackathon 2026
            </span>
            <span className="badge badge-blue text-xs">
              Testnet Live
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 leading-tight tracking-tight">
            Know Your Human
            <br />
            <span className="gradient-text">KYC for the Celo Ecosystem</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-3xl mx-auto mb-4 leading-relaxed">
            The first identity verification API built for AI agents and dApps on Celo.
            Verify once. Credential lives on-chain.{" "}
            <strong className="text-white">Anyone checks it for free.</strong>
          </p>
          <p className="text-base text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            From <strong className="text-gray-300">$0.001</strong> (phone + social, no documents) to{" "}
            <strong className="text-gray-300">$0.75</strong> (full biometric KYC + AML).
            Payments via <strong className="text-white">x402</strong>.
            Credentials via <strong className="text-white">EAS on Celo</strong>.
            Zero PII stored.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link href="/demo" className="btn-primary text-base px-6 py-3">
              🚀 Try Live Demo
            </Link>
            <Link href="/docs" className="btn-secondary text-base px-6 py-3">
              View API Docs
            </Link>
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
      <section className="py-24 px-4 sm:px-6" id="pricing">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-6">
              Four Tiers.{" "}
              <span className="gradient-text">One API.</span>
            </h2>
            <p className="text-gray-400 max-w-lg mx-auto leading-relaxed">
              Pay per verification in cUSD on Celo. No subscriptions, no minimums.
              Agents pay automatically via x402. Credentials reusable for 7–90 days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <VerificationCard
              tier="starter"
              price="$0.001"
              features={[
                "No passport required",
                "Phone number uniqueness",
                "Social presence proof",
                "Built for the unbanked",
                "EAS credential on Celo",
                "7-day validity",
              ]}
            />
            <VerificationCard
              tier="basic"
              price="$0.01"
              features={[
                "NFC passport chip scan",
                "ZK-SNARK proof",
                "Humanity + age verified",
                "No biometrics needed",
                "EAS credential on Celo",
                "30-day validity",
              ]}
            />
            <VerificationCard
              tier="standard"
              price="$0.25"
              features={[
                "Gov ID document scan",
                "Liveness check",
                "Face match verification",
                "ZK proof — no PII stored",
                "EAS credential on Celo",
                "60-day validity",
              ]}
              highlighted={true}
            />
            <VerificationCard
              tier="enhanced"
              price="$0.75"
              features={[
                "ZK passport + biometrics",
                "Full AML screening",
                "Sanctions list check",
                "Multi-provider assurance",
                "EAS credential on Celo",
                "90-day validity",
              ]}
            />
          </div>

          {/* Sponsor economics callout */}
          <div className="mt-14 rounded-2xl p-8 border border-[#35D07F]/20 bg-[#35D07F]/5 max-w-3xl mx-auto text-center">
            <p className="text-sm text-[#35D07F] font-semibold mb-1">💡 Sponsor Economics</p>
            <p className="text-gray-300 text-sm leading-relaxed">
              The first agent to verify a human earns back up to <strong className="text-white">2× their cost</strong> as
              subsequent agents pay a small read fee. After that, they earn <strong className="text-white">10% perpetually</strong>.
              Enforced on-chain by KYHRegistry.sol — no trust required.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 bg-gradient-to-b from-transparent to-[#0d1117]/50" id="how">
        <div className="w-full max-w-5xl mx-auto">
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

      {/* Use cases */}
      <section className="py-24 px-4 sm:px-6" id="use-cases">
        <div className="w-full max-w-5xl mx-auto">
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
      <section className="py-20 px-4 sm:px-6">
        <div className="w-full max-w-4xl mx-auto text-center">
          <p className="text-xs text-gray-600 uppercase tracking-widest mb-6 font-semibold">
            Powered By
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
      <section className="py-24 px-4 sm:px-6">
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
              that travel with your wallet. Agents pay. Humans verify once. Everyone benefits.
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
