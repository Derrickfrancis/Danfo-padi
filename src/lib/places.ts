import type { Stop } from "./domain";

// What a suggestion needs: enough to show in a list, and to search from.
export type PlaceMatch = {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
};

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 60;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 10;

// Makes two pieces of text easy to compare: no capitals, no accents
// ("Ìkẹjà" becomes "ikeja"), and any run of spaces or punctuation becomes one space.
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// How good a match is. 0 is best, and null means no match at all.
function rank(
  query: string,
  words: string[],
  name: string,
  alias: string,
  area: string,
): number | null {
  if (name === query || alias === query) return 0;
  if (name.startsWith(query)) return 1;
  if (name.split(" ").some((word) => word.startsWith(query))) return 2;
  if (alias.startsWith(query) || area.startsWith(query)) return 3;
  if (name.includes(query)) return 4;
  if (alias.includes(query) || area.includes(query)) return 5;
  // Last chance: every word they typed appears somewhere, in any order.
  const everything = `${name} ${alias} ${area}`;
  if (words.length > 1 && words.every((word) => everything.includes(word)))
    return 6;
  return null;
}

// Suggests stops for what a person has typed, best matches first.
export function searchPlaces(
  stops: readonly Stop[],
  rawQuery: string,
  limit = DEFAULT_LIMIT,
): PlaceMatch[] {
  // Cut the text to a sensible length first, so a huge input can never cause much work.
  const query = normalize(rawQuery.slice(0, MAX_QUERY_LENGTH));
  if (query.length < MIN_QUERY_LENGTH) return [];

  const safeLimit = Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const words = query.split(" ");

  const matches: { stop: Stop; rank: number }[] = [];
  for (const stop of stops) {
    const found = rank(
      query,
      words,
      normalize(stop.name),
      normalize(stop.local_alias ?? ""),
      normalize(stop.area),
    );
    if (found !== null) matches.push({ stop, rank: found });
  }

  return matches
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        a.stop.name.localeCompare(b.stop.name) ||
        a.stop.id.localeCompare(b.stop.id),
    )
    .slice(0, safeLimit)
    .map(({ stop }) => ({
      id: stop.id,
      name: stop.name,
      area: stop.area,
      lat: stop.lat,
      lng: stop.lng,
    }));
}
