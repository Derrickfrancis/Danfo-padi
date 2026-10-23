// What a check returns: may this request go ahead, and if not, how long to wait.
export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimiterOptions = {
  limit: number; // requests allowed per window
  windowMs: number; // length of a window, in milliseconds
  maxKeys?: number; // most people we remember at once
  now?: () => number; // the clock. Tests replace it so time can be controlled.
};

export type RateLimiter = {
  check: (key: string) => RateLimitResult;
  size: () => number;
};

type Entry = { count: number; resetAt: number };

// Counts requests per key (usually a person's address) in fixed windows.
// ASSUMPTION: this lives in one server's memory. Each server instance counts
// separately and a restart forgets everything. It slows down one client
// hammering one server. It is not a complete defence.
export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
  const { limit, windowMs } = options;
  const maxKeys = options.maxKeys ?? 10_000;
  const now = options.now ?? Date.now;

  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error("Rate limit: limit must be a whole number of at least 1");
  }
  if (!Number.isFinite(windowMs) || windowMs < 1) {
    throw new Error("Rate limit: windowMs must be a positive number");
  }
  if (!Number.isInteger(maxKeys) || maxKeys < 1) {
    throw new Error("Rate limit: maxKeys must be a whole number of at least 1");
  }

  const entries = new Map<string, Entry>();

  // Frees space so memory can never grow without limit: first forget anyone
  // whose window is over, and only then the longest-remembered others.
  function makeRoom(currentTime: number): void {
    for (const [key, entry] of entries) {
      if (entry.resetAt <= currentTime) entries.delete(key);
    }
    while (entries.size >= maxKeys) {
      const oldest = entries.keys().next();
      if (oldest.done) break;
      entries.delete(oldest.value);
    }
  }

  function check(key: string): RateLimitResult {
    const currentTime = now();
    let entry = entries.get(key);

    // A new person, or their last window is over: start a fresh one.
    if (!entry || entry.resetAt <= currentTime) {
      entries.delete(key);
      if (entries.size >= maxKeys) makeRoom(currentTime);
      entry = { count: 0, resetAt: currentTime + windowMs };
      entries.set(key, entry);
    }

    entry.count += 1;
    const allowed = entry.count <= limit;
    return {
      allowed,
      remaining: Math.max(limit - entry.count, 0),
      retryAfterSeconds: allowed
        ? 0
        : Math.ceil((entry.resetAt - currentTime) / 1000),
    };
  }

  return { check, size: () => entries.size };
}

// Works out who is asking, from the address the hosting platform puts in the headers.
// We only accept something that looks like an address. Anything else is "unknown",
// so a caller cannot invent endless fake identities or inject odd text.
// ASSUMPTION: these headers can be trusted only when the hosting platform sets them.
// Check this when we choose hosting. Run directly on the internet, a caller could fake them.
const ADDRESS_PATTERN = /^[0-9a-fA-F:.]{1,45}$/;

export function getClientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0].trim();
  const real = headers.get("x-real-ip")?.trim();

  for (const candidate of [forwarded, real]) {
    if (candidate && ADDRESS_PATTERN.test(candidate)) return candidate;
  }
  return "unknown";
}
