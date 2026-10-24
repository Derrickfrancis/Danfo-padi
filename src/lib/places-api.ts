// The most characters we accept in a search. Same limit searchPlaces uses.
export const MAX_PLACES_QUERY_CHARS = 60;

export type PlacesQueryResult =
  | { ok: true; q: string }
  | { ok: false; error: "invalid_request"; fields: string[] };

// Checks the "?q=..." part of the address. We expect exactly one thing: q.
// Anything extra, repeated or oversized is refused.
export function parsePlacesQuery(
  searchParams: URLSearchParams,
): PlacesQueryResult {
  const names = [...searchParams.keys()];

  if (names.length === 0) {
    return { ok: false, error: "invalid_request", fields: ["q"] };
  }

  // One name only, and it must be q. A repeated q ("?q=a&q=b") counts as two names.
  // We do not repeat the unexpected names back, because the caller chose them.
  if (names.length !== 1 || names[0] !== "q") {
    return { ok: false, error: "invalid_request", fields: ["(request)"] };
  }

  const q = searchParams.get("q") ?? "";
  if (q.length > MAX_PLACES_QUERY_CHARS) {
    return { ok: false, error: "invalid_request", fields: ["q"] };
  }

  return { ok: true, q };
}
