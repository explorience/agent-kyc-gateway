/**
 * EAS (Ethereum Attestation Service) Integration
 *
 * Replaces FederatedAttestations (deprecated with Celo L1 → L2 migration, March 2025).
 * EAS is live on Celo at 0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92.
 *
 * KYH Schema: uint8 level, string provider, bool demoMode
 * Levels: 1=Starter, 2=Basic, 3=Standard, 4=Enhanced
 *
 * Validity windows:
 *   Starter:  7 days
 *   Basic:    30 days
 *   Standard: 60 days
 *   Enhanced: 90 days
 */

export const EAS_CONTRACT_CELO = "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92";
export const EAS_CONTRACT_ALFAJORES = "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92";
export const CUSD_CELO = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const CUSD_ALFAJORES = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
export const CELO_RPC = "https://forno.celo.org";
export const ALFAJORES_RPC = "https://alfajores-forno.celo-testnet.org";

export const VALIDITY_WINDOWS: Record<string, number> = {
  starter: 7 * 24 * 60 * 60,
  basic: 30 * 24 * 60 * 60,
  standard: 60 * 24 * 60 * 60,
  enhanced: 90 * 24 * 60 * 60,
};

export const LEVEL_NUMBERS: Record<string, number> = {
  starter: 1,
  basic: 2,
  standard: 3,
  enhanced: 4,
};

export const LEVEL_NAMES: Record<number, string> = {
  1: "starter",
  2: "basic",
  3: "standard",
  4: "enhanced",
};

export interface KYHAttestation {
  uid: string;
  recipient: string;
  level: string;
  levelNum: number;
  provider: string;
  expiresAt: number;
  issuedAt: number;
  demoMode: boolean;
  transactionHash: string;
  network: string;
}

export function isEASConfigured(): boolean {
  return !!(process.env.ISSUER_PRIVATE_KEY && process.env.KYH_SCHEMA_UID);
}

function generateDemoUID(): string {
  return "0x" + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

/**
 * Issue a KYH credential as an EAS attestation on Celo.
 * Falls back to demo mode when ISSUER_PRIVATE_KEY or KYH_SCHEMA_UID not configured.
 */
export async function issueKYHCredential(
  recipientAddress: string,
  level: "starter" | "basic" | "standard" | "enhanced",
  provider: string,
  demoMode: boolean = false
): Promise<KYHAttestation> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + VALIDITY_WINDOWS[level];
  const levelNum = LEVEL_NUMBERS[level];
  const network = process.env.CELO_NETWORK === "mainnet" ? "celo" : "celo-alfajores";

  if (demoMode || !isEASConfigured()) {
    return {
      uid: generateDemoUID(),
      recipient: recipientAddress,
      level,
      levelNum,
      provider,
      expiresAt,
      issuedAt: now,
      demoMode: true,
      transactionHash: "0xdemo" + Math.random().toString(16).slice(2, 10),
      network,
    };
  }

  try {
    // Production: issue real EAS attestation on Celo
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const easSdk = require("@ethereum-attestation-service/eas-sdk") as {
      EAS: new (address: string) => {
        connect: (s: unknown) => void;
        attest: (params: unknown) => Promise<{ wait: () => Promise<unknown>; tx: { hash: string } }>;
      };
      SchemaEncoder: new (schema: string) => {
        encodeData: (fields: Array<{ name: string; value: unknown; type: string }>) => string;
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ethers } = require("ethers") as typeof import("ethers");
    const { EAS, SchemaEncoder } = easSdk;

    const rpcUrl = network === "celo" ? CELO_RPC : ALFAJORES_RPC;
    const easAddress = network === "celo" ? EAS_CONTRACT_CELO : EAS_CONTRACT_ALFAJORES;

    const providerRpc = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY!, providerRpc);

    const eas = new EAS(easAddress);
    eas.connect(signer);

    const schemaEncoder = new SchemaEncoder("uint8 level,string provider,bool demoMode");
    const encodedData = schemaEncoder.encodeData([
      { name: "level", value: levelNum, type: "uint8" },
      { name: "provider", value: provider, type: "string" },
      { name: "demoMode", value: false, type: "bool" },
    ]);

    const tx = await eas.attest({
      schema: process.env.KYH_SCHEMA_UID!,
      data: {
        recipient: recipientAddress,
        expirationTime: BigInt(expiresAt),
        revocable: true,
        data: encodedData,
      },
    });

    const uid = await tx.wait();

    return {
      uid: uid as string,
      recipient: recipientAddress,
      level,
      levelNum,
      provider,
      expiresAt,
      issuedAt: now,
      demoMode: false,
      transactionHash: tx.tx.hash,
      network,
    };
  } catch (error) {
    console.error("EAS attestation failed, falling back to demo mode:", error);
    return {
      uid: generateDemoUID(),
      recipient: recipientAddress,
      level,
      levelNum,
      provider,
      expiresAt,
      issuedAt: now,
      demoMode: true,
      transactionHash: "0xdemo-fallback" + Math.random().toString(16).slice(2, 8),
      network,
    };
  }
}

/**
 * Check if a wallet has a valid KYH EAS credential.
 */
export async function checkKYHCredential(
  attestationUID: string
): Promise<{ valid: boolean; level?: string; levelNum?: number; expiresAt?: number }> {
  if (!attestationUID || attestationUID.startsWith("0xdemo")) {
    return {
      valid: true,
      level: "demo",
      levelNum: 0,
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { EAS } = require("@ethereum-attestation-service/eas-sdk") as {
      EAS: new (address: string) => {
        connect: (s: unknown) => void;
        getAttestation: (uid: string) => Promise<{ revocationTime: bigint; expirationTime: bigint }>;
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ethers } = require("ethers") as typeof import("ethers");

    const providerRpc = new ethers.JsonRpcProvider(CELO_RPC);
    const eas = new EAS(EAS_CONTRACT_CELO);
    eas.connect(providerRpc);

    const attestation = await eas.getAttestation(attestationUID);
    const now = BigInt(Math.floor(Date.now() / 1000));

    const valid =
      attestation.revocationTime === BigInt(0) &&
      (attestation.expirationTime === BigInt(0) ||
        attestation.expirationTime > now);

    return {
      valid,
      expiresAt: Number(attestation.expirationTime),
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Format a KYH attestation for API response.
 */
export function formatAttestationResponse(att: KYHAttestation) {
  return {
    uid: att.uid,
    level: att.level,
    provider: att.provider,
    expiresAt: new Date(att.expiresAt * 1000).toISOString(),
    issuedAt: new Date(att.issuedAt * 1000).toISOString(),
    validityDays: Math.round(VALIDITY_WINDOWS[att.level] / 86400),
    network: att.network,
    demoMode: att.demoMode,
    easScanUrl: att.demoMode
      ? null
      : `https://celo.easscan.org/attestation/view/${att.uid}`,
  };
}
