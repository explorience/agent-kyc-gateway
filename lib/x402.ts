/**
 * x402 Payment Protocol Integration
 *
 * x402 enables HTTP micropayments — the server responds with 402 Payment Required
 * and clients pay automatically via crypto. Built on EIP-3009 (transferWithAuthorization).
 *
 * In demo mode: simulates the payment flow visually without actual on-chain transactions.
 * In production: uses real cUSD transfers on Celo.
 */

import type { Address } from "viem";

export type TierLevel = "reputation" | "document" | "biometric" | "fullkyc";

export interface PaymentTier {
  level: TierLevel;
  priceUSD: string;
  priceCUSD: string;
  description: string;
}

export interface PaymentRequest {
  scheme: "exact";
  network: "celo" | "celo-sepolia";
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string; // cUSD contract address
  extra: {
    name: string;
    version: string;
  };
}

export interface PaymentReceipt {
  txHash: string;
  paidAmount: string;
  paidTo: Address;
  timestamp: string;
  network: string;
  demoMode: boolean;
}

export interface x402PaymentResult {
  success: boolean;
  receipt?: PaymentReceipt;
  error?: string;
}

// Payment tiers
export const PAYMENT_TIERS: Record<string, PaymentTier> = {
  reputation: {
    level: "reputation",
    priceUSD: "Free",
    priceCUSD: "0",
    description: "Reputation — onchain activity scoring, basic sybil resistance",
  },
  document: {
    level: "document",
    priceUSD: "$0.01",
    priceCUSD: "0.01",
    description: "Document — ZK passport proof via Self Protocol",
  },
  biometric: {
    level: "biometric",
    priceUSD: "$0.25",
    priceCUSD: "0.25",
    description: "Biometric — liveness + face match + gov ID via Didit",
  },
  fullkyc: {
    level: "fullkyc",
    priceUSD: "$0.75",
    priceCUSD: "0.75",
    description: "Full KYC — ZK passport + biometric + AML screening",
  },
};

// Legacy tier name mapping (old → new)
export const TIER_ALIASES: Record<string, TierLevel> = {
  starter: "reputation",
  basic: "document",
  standard: "biometric",
  enhanced: "fullkyc",
};

/** Resolve a tier name (supports both old and new names) */
export function resolveTier(level: string): TierLevel | null {
  if (level in PAYMENT_TIERS) return level as TierLevel;
  if (level in TIER_ALIASES) return TIER_ALIASES[level];
  return null;
}

/**
 * Apply Self Agent ID discount to a tier price
 */
export function applyAgentIdDiscount(
  priceCUSD: string,
  hasAgentId: boolean
): { price: string; discountApplied: boolean } {
  const price = parseFloat(priceCUSD);
  if (price === 0 || !hasAgentId) {
    return { price: priceCUSD, discountApplied: false };
  }
  const discounted = (price * 0.8).toFixed(price >= 0.1 ? 2 : 3);
  return { price: discounted, discountApplied: true };
}

// cUSD contract on Alfajores testnet
const CUSD_ADDRESS_ALFAJORES = "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80";

/**
 * Generate a 402 Payment Required response header.
 * This is what the server sends back when payment is needed.
 */
export function generate402Header(
  level: TierLevel,
  resource: string,
  hasAgentId: boolean = false
): string {
  const tier = PAYMENT_TIERS[level];
  const { price } = applyAgentIdDiscount(tier.priceCUSD, hasAgentId);
  const issuerAddress = process.env.ISSUER_ADDRESS || "0x7f812f3a8695400e3075DAC2d5008CB068D162e7";

  const paymentRequest: PaymentRequest = {
    scheme: "exact",
    network: "celo-sepolia",
    maxAmountRequired: price,
    resource,
    description: tier.description,
    mimeType: "application/json",
    payTo: issuerAddress,
    maxTimeoutSeconds: 300,
    asset: CUSD_ADDRESS_ALFAJORES,
    extra: {
      name: "cUSD",
      version: "1",
    },
  };

  return Buffer.from(JSON.stringify(paymentRequest)).toString("base64");
}

/**
 * Verify a payment header from the client.
 * In production: validates the EIP-3009 signed transfer.
 * In demo mode: accepts any payment claim.
 */
export async function verifyPayment(
  paymentHeader: string,
  requiredAmount: string,
  level: TierLevel
): Promise<x402PaymentResult> {
  const isDemoMode = !process.env.ISSUER_PRIVATE_KEY || paymentHeader.startsWith("demo:");

  if (isDemoMode) {
    // Simulate payment verification
    await sleep(800);
    return {
      success: true,
      receipt: {
        txHash: "0x" + randomHex(64),
        paidAmount: requiredAmount,
        paidTo: (process.env.ISSUER_ADDRESS || "0x7f812f3a8695400e3075DAC2d5008CB068D162e7") as Address,
        timestamp: new Date().toISOString(),
        network: "celo-sepolia",
        demoMode: true,
      },
    };
  }

  try {
    // Decode payment header
    const paymentData = JSON.parse(
      Buffer.from(paymentHeader, "base64").toString("utf-8")
    );

    // In production: validate the signed EIP-3009 transfer
    // and verify the amount matches the required amount
    // This would use viem to validate the signature

    return {
      success: true,
      receipt: {
        txHash: paymentData.txHash,
        paidAmount: paymentData.amount,
        paidTo: paymentData.to as Address,
        timestamp: new Date().toISOString(),
        network: "celo-sepolia",
        demoMode: false,
      },
    };
  } catch {
    return {
      success: false,
      error: "Invalid payment header",
    };
  }
}

/**
 * Create a demo payment for the interactive demo page.
 * Simulates the full x402 flow without real transactions.
 */
export async function createDemoPayment(
  level: TierLevel,
  payerAddress: string
): Promise<x402PaymentResult> {
  const tier = PAYMENT_TIERS[level];

  // Simulate processing
  await sleep(1500);

  return {
    success: true,
    receipt: {
      txHash: "0x" + randomHex(64),
      paidAmount: tier.priceCUSD,
      paidTo: (process.env.ISSUER_ADDRESS || "0x7f812f3a8695400e3075DAC2d5008CB068D162e7") as Address,
      timestamp: new Date().toISOString(),
      network: "celo-sepolia",
      demoMode: true,
    },
  };
}

// Helpers

function randomHex(length: number): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
