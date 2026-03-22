interface VerificationCardProps {
  tier: "starter" | "basic" | "standard" | "enhanced";
  price: string;
  features: string[];
  highlighted?: boolean;
  onSelect?: () => void;
}

const tierConfig = {
  starter: {
    name: "Starter",
    icon: "📱",
    color: "text-purple-400",
    borderColor: "border-purple-500/30",
    bgColor: "bg-purple-500/5",
    badgeColor: "badge-blue",
    description: "Phone + social proof — no documents",
    validity: "7-day credential",
    providers: "Phone · Social Stamps",
  },
  basic: {
    name: "Basic",
    icon: "🔐",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/5",
    badgeColor: "badge-blue",
    description: "ZK passport proof via Self Protocol",
    validity: "30-day credential",
    providers: "Self Protocol",
  },
  standard: {
    name: "Standard",
    icon: "🪪",
    color: "text-[#35D07F]",
    borderColor: "border-[#35D07F]/30",
    bgColor: "bg-[#35D07F]/5",
    badgeColor: "badge-green",
    description: "Gov ID + liveness via ZK proofs",
    validity: "60-day credential",
    providers: "Human Passport",
  },
  enhanced: {
    name: "Enhanced",
    icon: "🛡️",
    color: "text-[#FCFF52]",
    borderColor: "border-[#FCFF52]/30",
    bgColor: "bg-[#FCFF52]/5",
    badgeColor: "badge-yellow",
    description: "ZK passport + biometric KYC + AML",
    validity: "90-day credential",
    providers: "Self · Didit · Human Passport",
  },
};

export default function VerificationCard({
  tier,
  price,
  features,
  highlighted = false,
  onSelect,
}: VerificationCardProps) {
  const config = tierConfig[tier];

  return (
    <div
      className={`relative rounded-2xl p-6 sm:p-7 border transition-all duration-200 ${
        highlighted
          ? `${config.bgColor} ${config.borderColor} shadow-lg`
          : "bg-[#111827] border-gray-800 hover:border-gray-600"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={`badge ${config.badgeColor} text-xs px-3 py-1`}>
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-2xl mb-1">{config.icon}</div>
          <h3 className={`text-lg font-bold ${config.color}`}>{config.name}</h3>
          <p className="text-gray-400 text-sm">{config.description}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-white">{price}</div>
          <div className="text-xs text-gray-500">cUSD per check</div>
        </div>
      </div>

      {/* Providers + validity */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-gray-500 font-mono">{config.providers}</span>
        <span className="text-gray-700">·</span>
        <span className={`text-xs font-mono ${config.color} opacity-70`}>{config.validity}</span>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
            <svg
              className={`w-4 h-4 flex-shrink-0 ${config.color}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* CTA */}
      {onSelect && (
        <button
          onClick={onSelect}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
            highlighted
              ? "bg-[#35D07F] text-[#0a0a0a] hover:bg-[#2db86e] hover:shadow-[0_8px_25px_rgba(53,208,127,0.3)]"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700"
          }`}
        >
          Select {config.name}
        </button>
      )}
    </div>
  );
}
