import { z } from "zod";
import type { RawParams } from "./routes-query";
import { buildTripHref, parseTripQuery } from "./trip-query";

// Most trips a person can keep. Older ones fall off the end.
export const MAX_SAVED = 20;

// A saved list longer than this cannot be ours, so we do not even try to read it.
const MAX_RAW_CHARS = 100_000;

// Turns "?a=1&a=2" into { a: ["1", "2"] } so a repeated name is not lost.
function toRawParams(searchParams: URLSearchParams): RawParams {
  const collected = new Map<string, string | string[]>();
  for (const [name, value] of searchParams) {
    const existing = collected.get(name);
    if (existing === undefined) collected.set(name, value);
    else
      collected.set(
        name,
        Array.isArray(existing) ? [...existing, value] : [existing, value],
      );
  }
  return Object.fromEntries(collected);
}

// True only for an address our own code would have built: same places, same trip id,
// same spelling, nothing extra. It also keeps out things like "javascript:..." and other sites.
function isCanonicalTripHref(href: string): boolean {
  if (!href.startsWith("/trip?")) return false;

  let url: URL;
  try {
    url = new URL(href, "http://localhost");
  } catch {
    return false;
  }
  if (url.pathname !== "/trip") return false;

  const parsed = parseTripQuery(toRawParams(url.searchParams));
  if (!parsed.ok) return false;
  return (
    buildTripHref(
      parsed.data.origin,
      parsed.data.destination,
      parsed.data.tripId,
    ) === href
  );
}

// What we keep on the phone for each saved trip: enough to show a line in the list.
// The words are only a snapshot. Opening the trip always runs a fresh search.
const SavedTripSchema = z
  .strictObject({
    href: z
      .string()
      .max(600)
      .refine(isCanonicalTripHref, { message: "not a trip address" }),
    title: z.string().min(1).max(200),
    via: z.string().min(1).max(200),
    fareMin: z.number().int().min(0).max(1_000_000),
    fareMax: z.number().int().min(0).max(1_000_000),
    estimate: z.boolean(),
    savedAt: z.number().int().min(0),
  })
  .refine((trip) => trip.fareMin <= trip.fareMax, {
    message: "fareMin is above fareMax",
  });

export type SavedTrip = z.infer<typeof SavedTripSchema>;
export type SavedTripInput = Omit<SavedTrip, "savedAt">;

// Reads the saved list from text kept on the phone. That text can be edited by the
// person, by a browser extension or by a bug, so nothing in it is trusted: every entry
// is checked, and anything wrong is quietly dropped instead of crashing the screen.
export function parseSavedTrips(raw: string | null): SavedTrip[] {
  if (!raw || raw.length > MAX_RAW_CHARS) return [];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(json)) return [];

  const trips: SavedTrip[] = [];
  const seen = new Set<string>();
  // Only look at a bounded number of entries, however long the list claims to be.
  for (const item of json.slice(0, MAX_SAVED * 2)) {
    const parsed = SavedTripSchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.href)) continue;
    seen.add(parsed.data.href);
    trips.push(parsed.data);
    if (trips.length === MAX_SAVED) break;
  }
  return trips;
}

export function serializeSavedTrips(trips: readonly SavedTrip[]): string {
  return JSON.stringify(trips);
}

// The newest trip goes first. Saving the same trip again just moves it to the top.
export function addSavedTrip(
  trips: readonly SavedTrip[],
  trip: SavedTrip,
): SavedTrip[] {
  return [
    trip,
    ...trips.filter((existing) => existing.href !== trip.href),
  ].slice(0, MAX_SAVED);
}

export function removeSavedTrip(
  trips: readonly SavedTrip[],
  href: string,
): SavedTrip[] {
  return trips.filter((existing) => existing.href !== href);
}

export function isSaved(trips: readonly SavedTrip[], href: string): boolean {
  return trips.some((existing) => existing.href === href);
}
