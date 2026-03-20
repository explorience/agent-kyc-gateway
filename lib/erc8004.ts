/**
 * ERC-8004 Agent Identity Verification
 *
 * Queries the Trustless Agents registry on Base to verify
 * that an agent is registered and fetch its metadata.
 */

import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";

// ERC-8004 Trustless Agents contract on Base
const ERC8004_CONTRACT = "0x1b7669e4aEf6d2e08b9C8Ca4571f99f2A0ba8B9F" as Address;

// Minimal ABI for ERC-721 + metadata
const ERC8004_ABI = [
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const baseClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org"),
});

export interface AgentInfo {
  agentId: number;
  owner: Address;
  registered: true;
}

export interface AgentMetadata {
  name?: string;
  description?: string;
  image?: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  raw?: string;
}

/**
 * Check if an agent ID is registered on the ERC-8004 registry.
 */
export async function isRegisteredAgent(agentId: number): Promise<boolean> {
  try {
    await baseClient.readContract({
      address: ERC8004_CONTRACT,
      abi: ERC8004_ABI,
      functionName: "ownerOf",
      args: [BigInt(agentId)],
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Verify an agent and return its owner address.
 */
export async function verifyAgent(agentId: number): Promise<AgentInfo | null> {
  try {
    const owner = await baseClient.readContract({
      address: ERC8004_CONTRACT,
      abi: ERC8004_ABI,
      functionName: "ownerOf",
      args: [BigInt(agentId)],
    });
    return { agentId, owner: owner as Address, registered: true };
  } catch {
    return null;
  }
}

/**
 * Fetch agent metadata from tokenURI.
 * Resolves IPFS URIs to HTTP gateway URLs.
 */
export async function getAgentMetadata(agentId: number): Promise<AgentMetadata | null> {
  try {
    const uri = await baseClient.readContract({
      address: ERC8004_CONTRACT,
      abi: ERC8004_ABI,
      functionName: "tokenURI",
      args: [BigInt(agentId)],
    });

    const tokenURI = uri as string;

    // Resolve IPFS URIs
    let fetchUrl = tokenURI;
    if (tokenURI.startsWith("ipfs://")) {
      fetchUrl = tokenURI.replace("ipfs://", "https://ipfs.io/ipfs/");
    }

    // Handle data URIs (base64 JSON)
    if (tokenURI.startsWith("data:application/json")) {
      const json = tokenURI.includes("base64,")
        ? Buffer.from(tokenURI.split("base64,")[1], "base64").toString()
        : decodeURIComponent(tokenURI.split(",")[1]);
      return JSON.parse(json) as AgentMetadata;
    }

    const response = await fetch(fetchUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { raw: tokenURI };
    }

    const metadata = (await response.json()) as AgentMetadata;
    return metadata;
  } catch {
    return null;
  }
}
