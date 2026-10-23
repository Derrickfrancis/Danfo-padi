import { parseSearchRequest, toTripDto } from "@/lib/api";
import { getNetwork } from "@/lib/data";
import { jsonResponse, readLimitedText } from "@/lib/http";
import { createRateLimiter, getClientKey } from "@/lib/rate-limit";
import { searchTrips } from "@/lib/search";

// A real request is about 100 bytes. We allow a little room, never more.
const MAX_BODY_BYTES = 4096;

// 30 searches a minute is plenty for a rider and too slow for a script.
const searchLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

// Only POST is exported, so every other method gets "405 Method Not Allowed".
export async function POST(request: Request): Promise<Response> {
  // First gate, before any other work: has this client asked too often?
  const rate = searchLimiter.check(getClientKey(request.headers));
  if (!rate.allowed) {
    return jsonResponse({ error: "rate_limited" }, 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ error: "unsupported_media_type" }, 415);
  }

  const bodyText = await readLimitedText(request, MAX_BODY_BYTES);
  if (bodyText === null) {
    return jsonResponse({ error: "too_large" }, 413);
  }

  const parsed = parseSearchRequest(bodyText);
  if (!parsed.ok) {
    const status = parsed.error === "too_large" ? 413 : 400;
    return jsonResponse({ error: parsed.error, fields: parsed.fields }, status);
  }

  try {
    const network = await getNetwork();
    const trips = searchTrips(
      network,
      parsed.data.origin,
      parsed.data.destination,
    );
    return jsonResponse({ trips: trips.map((trip) => toTripDto(trip)) });
  } catch (error) {
    // Log what went wrong for us, but tell the caller nothing about the inside.
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "unknown error";
    console.error("search failed:", message);
    return jsonResponse({ error: "server_error" }, 500);
  }
}
