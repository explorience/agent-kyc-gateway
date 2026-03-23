/**
 * ENS Name Resolution
 *
 * Resolves Ethereum addresses to ENS names and vice versa.
 * Uses Ethereum mainnet for resolution (ENS lives on L1).
 * Caches results to minimize RPC calls.
 */

import { createPublicClient, http, type Address } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

// Use public Ethereum RPC for ENS lookups
const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ENS_RPC_URL || "https://ethereum-rpc.publicnode.com"),
});

// Simple in-memory cache (address → name, name → address)
const nameCache = new Map<string, string | null>();
const addressCache = new Map<string, string | null>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const cacheTimestamps = new Map<string, number>();

function isCacheValid(key: string): boolean {
  const ts = cacheTimestamps.get(key);
  return ts != null && Date.now() - ts < CACHE_TTL;
}

/**
 * Resolve an address to its primary ENS name.
 * Returns null if no name is set.
 */
export async function resolveENSName(
  address: string
): Promise<string | null> {
  const lower = address.toLowerCase();

  if (nameCache.has(lower) && isCacheValid(`name:${lower}`)) {
    return nameCache.get(lower) ?? null;
  }

  try {
    const name = await ensClient.getEnsName({
      address: lower as Address,
    });
    nameCache.set(lower, name);
    cacheTimestamps.set(`name:${lower}`, Date.now());
    return name;
  } catch {
    nameCache.set(lower, null);
    cacheTimestamps.set(`name:${lower}`, Date.now());
    return null;
  }
}

/**
 * Resolve an ENS name to an address.
 * Returns null if the name doesn't resolve.
 */
export async function resolveENSAddress(
  name: string
): Promise<string | null> {
  const normalized = normalize(name);

  if (addressCache.has(normalized) && isCacheValid(`addr:${normalized}`)) {
    return addressCache.get(normalized) ?? null;
  }

  try {
    const address = await ensClient.getEnsAddress({
      name: normalized,
    });
    addressCache.set(normalized, address);
    cacheTimestamps.set(`addr:${normalized}`, Date.now());
    return address;
  } catch {
    addressCache.set(normalized, null);
    cacheTimestamps.set(`addr:${normalized}`, Date.now());
    return null;
  }
}

/**
 * Get ENS avatar URL for an address or name.
 */
export async function getENSAvatar(
  nameOrAddress: string
): Promise<string | null> {
  try {
    const name = nameOrAddress.includes(".")
      ? normalize(nameOrAddress)
      : await resolveENSName(nameOrAddress);

    if (!name) return null;

    const avatar = await ensClient.getEnsAvatar({ name: normalize(name) });
    return avatar;
  } catch {
    return null;
  }
}

/**
 * Check if a string is an ENS name (contains a dot).
 */
export function isENSName(input: string): boolean {
  return input.includes(".") && !input.startsWith("0x");
}

/**
 * Resolve input to an address — accepts either hex address or ENS name.
 * Returns the address if it's already a hex address.
 */
export async function resolveToAddress(
  input: string
): Promise<string | null> {
  if (input.startsWith("0x") && input.length === 42) {
    return input;
  }
  return resolveENSAddress(input);
}

/**
 * Enrich an address with ENS data.
 * Returns { address, ensName, ensAvatar } or just { address } if no ENS.
 */
export async function enrichWithENS(address: string): Promise<{
  address: string;
  ensName?: string;
  ensAvatar?: string;
}> {
  const name = await resolveENSName(address);
  if (!name) return { address };

  const avatar = await getENSAvatar(name);
  return {
    address,
    ensName: name,
    ...(avatar ? { ensAvatar: avatar } : {}),
  };
}
