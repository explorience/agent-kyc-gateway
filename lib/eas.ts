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

// EAS is only deployed on Celo Mainnet (not on any testnet)
export const EAS_CONTRACT = "0x72E1d8ccf5299fb36fEfD8CC4394B8ef7e98Af92";
export const SCHEMA_REGISTRY = "0x5ece93bE4BDCF293Ed61FA78698B594F2135AF34";
export const CUSD_CELO = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
export const CELO_RPC = "https://forno.celo.org";

export const VALIDITY_WINDOWS: Record<string, number> = {
  // All tiers: 90-day validity
  reputation: 90 * 24 * 60 * 60,
  document: 90 * 24 * 60 * 60,
  biometric: 90 * 24 * 60 * 60,
  fullkyc: 90 * 24 * 60 * 60,
  // Legacy aliases
  starter: 90 * 24 * 60 * 60,
  basic: 90 * 24 * 60 * 60,
  standard: 90 * 24 * 60 * 60,
  enhanced: 90 * 24 * 60 * 60,
};

export const LEVEL_NUMBERS: Record<string, number> = {
  reputation: 1,
  document: 2,
  biometric: 3,
  fullkyc: 4,
  // Legacy aliases
  starter: 1,
  basic: 2,
  standard: 3,
  enhanced: 4,
};

export const LEVEL_NAMES: Record<number, string> = {
  1: "reputation",
  2: "document",
  3: "biometric",
  4: "fullkyc",
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
  easError?: string;
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
  level: string,
  provider: string,
  demoMode: boolean = false
): Promise<KYHAttestation> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + VALIDITY_WINDOWS[level];
  const levelNum = LEVEL_NUMBERS[level];
  const network = "celo"; // EAS only on mainnet

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

    const rpcUrl = CELO_RPC;
    const easAddress = EAS_CONTRACT;

    const providerRpc = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(process.env.ISSUER_PRIVATE_KEY!, providerRpc);

    const eas = new EAS(easAddress);
    eas.connect(signer);

    const schemaEncoder = new SchemaEncoder("bytes32 credentialType,uint8 assuranceLevel,bytes32 verificationMethod,bytes32 evidenceRef");

    // Encode fields as bytes32
    const credentialTypeBytes = ethers.encodeBytes32String("kyh-credential");
    const verificationMethodBytes = ethers.encodeBytes32String(provider.slice(0, 31));
    const evidenceRefBytes = ethers.encodeBytes32String("ipfs"); // TODO: actual evidence hash

    const encodedData = schemaEncoder.encodeData([
      { name: "credentialType", value: credentialTypeBytes, type: "bytes32" },
      { name: "assuranceLevel", value: levelNum, type: "uint8" },
      { name: "verificationMethod", value: verificationMethodBytes, type: "bytes32" },
      { name: "evidenceRef", value: evidenceRefBytes, type: "bytes32" },
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

    // EAS SDK returns different shapes depending on version
    // Try tx.wait() for UID, and tx.tx?.hash or tx.receipt?.hash for tx hash
    let uid: string;
    let txHash: string;
    
    if (typeof tx === 'object' && 'wait' in tx) {
      uid = (await tx.wait()) as string;
      txHash = (tx as Record<string, unknown>).tx 
        ? ((tx as Record<string, unknown>).tx as Record<string, string>).hash
        : ((tx as Record<string, unknown>).receipt as Record<string, string>)?.transactionHash || "unknown";
    } else {
      uid = String(tx);
      txHash = "unknown";
    }

    return {
      uid,
      recipient: recipientAddress,
      level,
      levelNum,
      provider,
      expiresAt,
      issuedAt: now,
      demoMode: false,
      transactionHash: txHash,
      network,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("EAS attestation failed, falling back to demo mode:", errMsg);
    return {
      uid: generateDemoUID(),
      recipient: recipientAddress,
      level,
      levelNum,
      provider,
      expiresAt,
      easError: errMsg,
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
    const eas = new EAS(EAS_CONTRACT);
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
    transactionHash: att.transactionHash || null,
    easScanUrl: att.demoMode
      ? null
      : `https://celo.easscan.org/attestation/view/${att.uid}`,
    ...(att.easError ? { easError: att.easError } : {}),
  };
}
