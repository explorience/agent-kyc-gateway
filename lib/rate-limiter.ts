/**
 * Rate Limiter for Agent KYC Gateway
 *
 * In-memory rate limiting per agent address per verification level.
 * Generous limits — agents are paying customers.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number; // timestamp ms
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

// Generous limits per hour per agent
const RATE_LIMITS: Record<string, number> = {
  basic: 100,
  standard: 50,
  enhanced: 20,
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Map key: `${agentAddress}:${level}`
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 10 minutes
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 10 * 60 * 1000) return;
  lastCleanup = now;

  rateLimitStore.forEach((entry, key) => {
    if (now - entry.windowStart > WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  });
}

/**
 * Check if a request is within rate limits.
 * Call this BEFORE processing a verification request.
 */
export function checkRateLimit(
  agentAddress: string,
  level: string
): RateLimitResult {
  cleanup();

  const key = `${agentAddress.toLowerCase()}:${level}`;
  const limit = RATE_LIMITS[level] || RATE_LIMITS.basic;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Reset window if expired
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 0, windowStart: now };
    rateLimitStore.set(key, entry);
  }

  const resetAt = new Date(entry.windowStart + WINDOW_MS);
  const remaining = Math.max(0, limit - entry.count);

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt, limit };
  }

  // Increment counter
  entry.count++;
  return {
    allowed: true,
    remaining: Math.max(0, limit - entry.count),
    resetAt,
    limit,
  };
}

/**
 * Get the Retry-After value in seconds for a rate-limited request.
 */
export function getRetryAfter(resetAt: Date): number {
  return Math.ceil((resetAt.getTime() - Date.now()) / 1000);
}
