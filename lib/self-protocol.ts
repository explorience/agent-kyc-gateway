import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celoSepolia } from "viem/chains";
import { OdisUtils } from "@celo/identity";
import { OdisContextName } from "@celo/identity/lib/odis/query";
import type { AuthSigner } from "@celo/identity/lib/odis/query";
import { getContract } from "viem";
import {
  federatedAttestationsABI,
  odisPaymentsABI,
  stableTokenABI,
} from "@celo/abis";

// Contract addresses (Alfajores testnet)
const FEDERATED_ATTESTATIONS_ADDRESS = process.env.FEDERATED_ATTESTATIONS_ADDRESS || 
  "0xb0Fe4466f288A3BbE5C2736B081B2021080DF703";
const ODIS_PAYMENTS_ADDRESS = process.env.ODIS_PAYMENTS_ADDRESS ||
  "0x96AfaE75F12A759c1dFB364ce93548c3Bd242D58";
const STABLE_TOKEN_ADDRESS = process.env.STABLE_TOKEN_ADDRESS ||
  "0xEF4d55D6dE8e8d73232827Cd1e9b2F2dBb45bC80";

const RPC_URL = process.env.CELO_ALFAJORES_RPC || "https://celo-sepolia.drpc.org";

// Initialize clients
const publicClient = createPublicClient({
  chain: celoSepolia,
  transport: http(RPC_URL),
});

let walletClient: ReturnType<typeof createWalletClient> | null = null;

function getWalletClient(): ReturnType<typeof createWalletClient> {
  if (!walletClient) {
    const privateKey = process.env.ISSUER_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("ISSUER_PRIVATE_KEY not configured");
    }
    const account = privateKeyToAccount(privateKey as Hex);
    walletClient = createWalletClient({
      account,
      chain: celoSepolia,
      transport: http(RPC_URL),
    });
  }
  return walletClient;
}

function getIssuerAddress(): Address {
  const client = getWalletClient();
  if (!client.account) {
    throw new Error("Wallet client has no account");
  }
  return client.account.address;
}

function getAuthSigner(): AuthSigner {
  const privateKey = process.env.ISSUER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("ISSUER_PRIVATE_KEY not configured");
  }
  return {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: privateKey,
  };
}

function getServiceContext() {
  return OdisUtils.Query.getServiceContext(OdisContextName.ALFAJORES);
}

export interface VerificationLevel {
  level: "basic" | "standard" | "enhanced";
  fee: string;
  identifierType: string;
}

// Verification level configurations
export const VERIFICATION_LEVELS: Record<string, VerificationLevel> = {
  basic: {
    level: "basic",
    fee: "0.25", // cUSD
    identifierType: OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
  },
  standard: {
    level: "standard",
    fee: "1.50", // cUSD
    identifierType: OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
  },
  enhanced: {
    level: "enhanced",
    fee: "5.00", // cUSD
    identifierType: OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
  },
};

export async function checkOdisQuota(): Promise<number> {
  const issuerAddress = getIssuerAddress();
  const authSigner = getAuthSigner();
  const serviceContext = getServiceContext();

  const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
    issuerAddress,
    authSigner,
    serviceContext
  );

  return remainingQuota;
}

export async function purchaseOdisQuota(): Promise<void> {
  const wallet = getWalletClient();
  const issuerAddress = getIssuerAddress();

  const stableToken = getContract({
    address: STABLE_TOKEN_ADDRESS as Address,
    abi: stableTokenABI,
    client: { public: publicClient, wallet },
  });

  const odisPayments = getContract({
    address: ODIS_PAYMENTS_ADDRESS as Address,
    abi: odisPaymentsABI,
    client: { public: publicClient, wallet },
  });

  // 0.01 cUSD = 100 queries
  const ONE_CENT_CUSD = parseEther("0.01");
  const walletClient = getWalletClient();

  // Approve ODIS Payments to spend cUSD
  const account = walletClient.account;
  if (!account) {
    throw new Error("Wallet account not available");
  }
  // Using any to bypass viem strict typing for hackathon speed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approveHash = await (walletClient as any).writeContract({
    address: STABLE_TOKEN_ADDRESS,
    abi: stableTokenABI,
    functionName: "approve",
    args: [ODIS_PAYMENTS_ADDRESS, ONE_CENT_CUSD],
  });
  await publicClient.waitForTransactionReceipt({ hash: approveHash });

  // Pay for quota
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const paymentHash = await (walletClient as any).writeContract({
    address: ODIS_PAYMENTS_ADDRESS,
    abi: odisPaymentsABI,
    functionName: "payInCUSD",
    args: [issuerAddress, ONE_CENT_CUSD],
  });
  await publicClient.waitForTransactionReceipt({ hash: paymentHash });

  console.log("ODIS quota purchased successfully");
}

export async function registerAttestation(
  plaintextIdentifier: string,
  userAddress: Address
): Promise<{ obfuscatedIdentifier: Hex; transactionHash: string }> {
  const issuerAddress = getIssuerAddress();
  const authSigner = getAuthSigner();
  const serviceContext = getServiceContext();

  // Check quota
  const quota = await checkOdisQuota();
  if (quota < 1) {
    console.log("Insufficient ODIS quota, purchasing more...");
    await purchaseOdisQuota();
  }

  // Get obfuscated identifier
  console.log("Getting obfuscated identifier for:", plaintextIdentifier);
  const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifier(
    plaintextIdentifier,
    OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
    issuerAddress,
    authSigner,
    serviceContext
  );

  console.log("Obfuscated Identifier:", obfuscatedIdentifier);

  // Register attestation on-chain using direct writeContract
  const wallet = getWalletClient();
  const attestationVerifiedTime = BigInt(Math.floor(Date.now() / 1000));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hash = await (wallet as any).writeContract({
    address: FEDERATED_ATTESTATIONS_ADDRESS,
    abi: federatedAttestationsABI,
    functionName: "registerAttestationAsIssuer",
    args: [obfuscatedIdentifier, userAddress, attestationVerifiedTime],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  console.log("Attestation registered:", receipt.transactionHash);

  return {
    obfuscatedIdentifier: obfuscatedIdentifier as Hex,
    transactionHash: receipt.transactionHash,
  };
}

export async function lookupAttestations(
  plaintextIdentifier: string,
  trustedIssuers: Address[]
): Promise<Address[]> {
  const privateKey = process.env.ISSUER_PRIVATE_KEY || "0x";
  const authSigner: AuthSigner = {
    authenticationMethod: OdisUtils.Query.AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: privateKey,
  };

  const serviceContext = getServiceContext();

  // Get obfuscated identifier
  const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifier(
    plaintextIdentifier,
    OdisUtils.Identifier.IdentifierPrefix.PHONE_NUMBER,
    "0x0000000000000000000000000000000000000000" as Address,
    authSigner,
    serviceContext
  );

  // Query FederatedAttestations
  const federatedAttestations = getContract({
    address: FEDERATED_ATTESTATIONS_ADDRESS as Address,
    abi: federatedAttestationsABI,
    client: publicClient,
  });

  const attestations = await federatedAttestations.read.lookupAttestations([
    obfuscatedIdentifier as Hex,
    trustedIssuers,
  ]);

  const [countsPerIssuer, accounts] = attestations;

  // Flatten accounts from all issuers
  const result: Address[] = [];
  let accountIndex = 0;
  for (let i = 0; i < trustedIssuers.length; i++) {
    const count = Number(countsPerIssuer[i]);
    for (let j = 0; j < count; j++) {
      if (accounts[accountIndex]) {
        result.push(accounts[accountIndex] as Address);
      }
      accountIndex++;
    }
  }

  return result;
}

// Check if a wallet address has a valid attestation from our gateway
export async function isVerified(userAddress: Address): Promise<boolean> {
  const issuerAddress = getIssuerAddress();
  const attestations = await lookupAttestation(issuerAddress, userAddress);
  return attestations.length > 0;
}

export async function lookupAttestation(
  issuer: Address,
  userAddress: Address
): Promise<{ issuedAt: bigint; publishedOn: bigint }[]> {
  // Simplified lookup - returns empty for now
  // In production, would use lookupAttestations with proper identifier tracking
  return [];
}

export const config = {
  federatedAttestationsAddress: FEDERATED_ATTESTATIONS_ADDRESS,
  odisPaymentsAddress: ODIS_PAYMENTS_ADDRESS,
  stableTokenAddress: STABLE_TOKEN_ADDRESS,
  rpcUrl: RPC_URL,
};
