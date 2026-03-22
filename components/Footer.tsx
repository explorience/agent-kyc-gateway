import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#0a0a0a] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#35D07F] to-[#2db86e] flex items-center justify-center font-black text-[#0a0a0a] text-sm">
                K
              </div>
              <span className="font-bold text-white text-lg">
                KYC<span className="text-[#35D07F]">Gateway</span>
              </span>
            </div>
            <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
              Privacy-preserving identity verification for AI agents. Built on
              Celo with Self Protocol ZK proofs and x402 micropayments.
            </p>
            <p className="text-gray-600 text-xs mt-4">
              Built for Celo Hackathon 2026 · Deadline March 22
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2">
              {[
                { href: "/", label: "Overview" },
                { href: "/demo", label: "Try Demo" },
                { href: "/explorer", label: "Explorer" },
                { href: "/docs", label: "API Docs" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tech */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Built With</h4>
            <ul className="space-y-2">
              {[
                { href: "https://celo.org", label: "Celo Blockchain" },
                { href: "https://self.xyz", label: "Self Protocol" },
                { href: "https://x402.org", label: "x402 Protocol" },
                {
                  href: "https://github.com/explorience/know-your-human",
                  label: "GitHub",
                },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-400 hover:text-[#35D07F] text-sm transition-colors"
                  >
                    {link.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-600 text-xs">
            © 2026 KYCGateway. Open source under MIT License.
          </p>
          <div className="flex items-center gap-2">
            <span className="badge badge-green text-xs">Testnet</span>
            <span className="text-gray-600 text-xs">Celo Alfajores</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
