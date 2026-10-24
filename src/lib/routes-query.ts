import { SearchRequestSchema } from "./api";
import type { Point } from "./geo";
import type { SortMode } from "./ranking";

// The "?name=value" parts of an address, as Next.js hands them to a page.
export type RawParams = Record<string, string | string[] | undefined>;

export type RoutesQuery = { origin: Point; destination: Point; sort: SortMode };

// Either clean, checked data, or just "no". We never say what was wrong, and we
// never repeat anything from the address, because anyone can edit an address.
export type RoutesQueryResult = { ok: true; data: RoutesQuery } | { ok: false };

// The only things a Routes address may contain.
const ALLOWED_NAMES = new Set(["olat", "olng", "dlat", "dlng", "sort"]);
const SORT_MODES: readonly SortMode[] = ["best", "cheapest", "fastest"];

// Plain decimal numbers only: an optional minus, up to 3 digits, up to 6 decimals.
// This refuses things like "1e1", "0x10", " 6.5", "Infinity" and "6.5abc".
const COORDINATE = /^-?\d{1,3}(\.\d{1,6})?$/;

function readCoordinate(value: string | undefined): number | undefined {
  if (value === undefined || !COORDINATE.test(value)) return undefined;
  return Number(value);
}

export function parseRoutesQuery(params: RawParams): RoutesQueryResult {
  const values = new Map<string, string>();
  for (const [name, value] of Object.entries(params)) {
    // Unknown names, and values given more than once, are refused.
    if (!ALLOWED_NAMES.has(name) || typeof value !== "string")
      return { ok: false };
    values.set(name, value);
  }

  const requested = values.get("sort") ?? "best";
  const sort = SORT_MODES.find((mode) => mode === requested);
  if (!sort) return { ok: false };

  // The same strict check the search endpoint uses, including the Lagos limits.
  const places = SearchRequestSchema.safeParse({
    origin: {
      lat: readCoordinate(values.get("olat")),
      lng: readCoordinate(values.get("olng")),
    },
    destination: {
      lat: readCoordinate(values.get("dlat")),
      lng: readCoordinate(values.get("dlng")),
    },
  });
  if (!places.success) return { ok: false };

  return {
    ok: true,
    data: {
      origin: places.data.origin,
      destination: places.data.destination,
      sort,
    },
  };
}
// Builds the address of a Routes page from places we have already checked.
// "best" is the default order, so it is left out of the address.
export function buildRoutesHref(
  origin: Point,
  destination: Point,
  sort: SortMode,
): string {
  const params = new URLSearchParams({
    olat: String(origin.lat),
    olng: String(origin.lng),
    dlat: String(destination.lat),
    dlng: String(destination.lng),
  });
  if (sort !== "best") params.set("sort", sort);
  return `/routes?${params.toString()}`;
}
