import { getStops } from "@/lib/data";
import { jsonResponse } from "@/lib/http";
import { searchPlaces } from "@/lib/places";
import { parsePlacesQuery } from "@/lib/places-api";
import { createRateLimiter, getClientKey } from "@/lib/rate-limit";

// Suggestions are asked for as people type, so this allows more than the search does.
const placesLimiter = createRateLimiter({ limit: 120, windowMs: 60_000 });

// Only GET is exported, so every other method gets "405 Method Not Allowed".
export async function GET(request: Request): Promise<Response> {
  // First gate, before any other work: has this client asked too often?
  const rate = placesLimiter.check(getClientKey(request.headers));
  if (!rate.allowed) {
    return jsonResponse({ error: "rate_limited" }, 429, {
      "Retry-After": String(rate.retryAfterSeconds),
    });
  }

  const parsed = parsePlacesQuery(new URL(request.url).searchParams);
  if (!parsed.ok) {
    return jsonResponse({ error: parsed.error, fields: parsed.fields }, 400);
  }

  try {
    const stops = await getStops();
    return jsonResponse({ places: searchPlaces(stops, parsed.q) });
  } catch (error) {
    // Log what went wrong for us, but tell the caller nothing about the inside.
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "unknown error";
    console.error("places failed:", message);
    return jsonResponse({ error: "server_error" }, 500);
  }
}
