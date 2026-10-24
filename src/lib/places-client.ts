import { z } from "zod";
import { MAX_PLACES_QUERY_CHARS } from "./places-api";
import type { PlaceMatch } from "./places";

// What can go wrong when asking for suggestions. The screen decides what to say.
export type FetchPlacesFailure =
  | "aborted"
  | "network"
  | "rate_limited"
  | "bad_request"
  | "server_error"
  | "bad_response";

export type FetchPlacesResult =
  | { ok: true; places: PlaceMatch[] }
  | { ok: false; reason: FetchPlacesFailure };

// Anything that works like the browser's fetch. Tests pass in a pretend one.
type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export type FetchPlacesOptions = {
  signal?: AbortSignal; // lets the caller cancel a request that is no longer wanted
  fetchImpl?: FetchLike;
};

// Even though the answer comes from our own server, we check its shape before
// using it. An error page, a proxy message or a bug should never reach the screen.
const PlaceSchema = z.strictObject({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  area: z.string().min(1).max(80),
  lat: z.number(),
  lng: z.number(),
});

const PlacesResponseSchema = z.strictObject({
  places: z.array(PlaceSchema).max(10),
});

export async function fetchPlaces(
  query: string,
  options: FetchPlacesOptions = {},
): Promise<FetchPlacesResult> {
  // Never send something we already know the server will refuse.
  if (query.length > MAX_PLACES_QUERY_CHARS) {
    return { ok: false, reason: "bad_request" };
  }

  const doFetch: FetchLike =
    options.fetchImpl ?? ((input, init) => fetch(input, init));

  let response: Response;
  try {
    // encodeURIComponent makes typed text safe to put in an address, so what
    // someone types can never add extra parameters or change the request.
    response = await doFetch(`/api/places?q=${encodeURIComponent(query)}`, {
      signal: options.signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, reason: "aborted" };
    }
    return { ok: false, reason: "network" };
  }

  if (response.status === 429) return { ok: false, reason: "rate_limited" };
  if (response.status === 400) return { ok: false, reason: "bad_request" };
  if (!response.ok) return { ok: false, reason: "server_error" };

  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return { ok: false, reason: "bad_response" };
  }

  const parsed = PlacesResponseSchema.safeParse(json);
  if (!parsed.success) return { ok: false, reason: "bad_response" };

  return { ok: true, places: parsed.data.places };
}
