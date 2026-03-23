interface AttestationBadgeProps {
  level: "basic" | "standard" | "enhanced" | "none";
  issuedAt?: string;
  txHash?: string;
  compact?: boolean;
}

const levelConfig = {
  basic: {
    label: "Basic Verified",
    icon: "✓",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    dot: "bg-blue-400",
  },
  standard: {
    label: "Standard Verified",
    icon: "✓✓",
    color: "text-[#35D07F]",
    bg: "bg-[#35D07F]/10",
    border: "border-[#35D07F]/30",
    dot: "bg-[#35D07F]",
  },
  enhanced: {
    label: "Enhanced Verified",
    icon: "✓✓✓",
    color: "text-[#FCFF52]",
    bg: "bg-[#FCFF52]/10",
    border: "border-[#FCFF52]/30",
    dot: "bg-[#FCFF52]",
  },
  none: {
    label: "Not Verified",
    icon: "✗",
    color: "text-gray-500",
    bg: "bg-gray-800",
    border: "border-gray-700",
    dot: "bg-gray-500",
  },
};

export default function AttestationBadge({
  level,
  issuedAt,
  txHash,
  compact = false,
}: AttestationBadgeProps) {
  const config = levelConfig[level];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.color} border ${config.border}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${config.dot} ${
            level !== "none" ? "animate-pulse" : ""
          }`}
        />
        {config.label}
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl p-4 border ${config.bg} ${config.border} flex items-center gap-3`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${config.bg} border ${config.border}`}
      >
        <span className={config.color}>{config.icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${config.color}`}>
          {config.label}
        </div>
        {issuedAt && (
          <div className="text-xs text-gray-500 mt-0.5">
            Issued {new Date(issuedAt).toLocaleDateString()}
          </div>
        )}
        {txHash && (
          <a
            href={`https://celoscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#35D07F] hover:underline mt-0.5 block font-mono truncate"
          >
            {txHash.slice(0, 20)}...{txHash.slice(-6)}
          </a>
        )}
      </div>
      {level !== "none" && (
        <div
          className={`w-2 h-2 rounded-full ${config.dot} flex-shrink-0 animate-pulse`}
        />
      )}
    </div>
  );
}
