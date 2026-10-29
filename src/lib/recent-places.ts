import { z } from "zod";
import { LAGOS_BOUNDS } from "./api";
import type { PlaceMatch } from "./places";

// How many recent places we keep. Older ones fall off the end.
export const MAX_RECENT = 5;

// A recent list longer than this cannot be ours, so we do not even try to read it.
const MAX_RAW_CHARS = 20_000;

// The same five things a suggestion has. Anything else, or anything outside Lagos, is refused.
const RecentPlaceSchema = z.strictObject({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  area: z.string().min(1).max(80),
  lat: z.number().min(LAGOS_BOUNDS.minLat).max(LAGOS_BOUNDS.maxLat),
  lng: z.number().min(LAGOS_BOUNDS.minLng).max(LAGOS_BOUNDS.maxLng),
});

// Reads the recent places from text kept on the phone. That text can be edited by the
// person, by a browser extension or by a bug, so nothing in it is trusted: every entry
// is checked, and anything wrong is quietly dropped instead of crashing the screen.
export function parseRecentPlaces(raw: string | null): PlaceMatch[] {
  if (!raw || raw.length > MAX_RAW_CHARS) return [];

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(json)) return [];

  const places: PlaceMatch[] = [];
  const seen = new Set<string>();
  // Only look at a bounded number of entries, however long the list claims to be.
  for (const item of json.slice(0, MAX_RECENT * 4)) {
    const parsed = RecentPlaceSchema.safeParse(item);
    if (!parsed.success || seen.has(parsed.data.id)) continue;
    seen.add(parsed.data.id);
    places.push(parsed.data);
    if (places.length === MAX_RECENT) break;
  }
  return places;
}

export function serializeRecentPlaces(places: readonly PlaceMatch[]): string {
  return JSON.stringify(places);
}

// The newest place goes first. Using the same place again just moves it to the top.
export function addRecentPlace(
  places: readonly PlaceMatch[],
  place: PlaceMatch,
): PlaceMatch[] {
  return [
    place,
    ...places.filter((existing) => existing.id !== place.id),
  ].slice(0, MAX_RECENT);
}
