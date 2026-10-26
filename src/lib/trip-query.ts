import type { Point } from "./geo";
import { parseRoutesQuery, type RawParams } from "./routes-query";

export type TripQuery = { origin: Point; destination: Point; tripId: string };

// Either clean, checked data, or just "no". Nothing from the address is ever repeated back.
export type TripQueryResult = { ok: true; data: TripQuery } | { ok: false };

// A trip id is its legs' ids joined with ">". Each id is lowercase letters, digits and
// underscores, up to 64 characters, and a trip has at most 8 legs.
const TRIP_ID = /^[a-z0-9_]{1,64}(>[a-z0-9_]{1,64}){0,7}$/;

export function parseTripQuery(params: RawParams): TripQueryResult {
  const { trip, ...rest } = params;
  if (typeof trip !== "string" || !TRIP_ID.test(trip)) return { ok: false };

  // The trip page has no sort order, so a "sort" in the address is not something we sent.
  if ("sort" in rest) return { ok: false };

  // The places are checked by the same strict reader the Routes page uses.
  const places = parseRoutesQuery(rest);
  if (!places.ok) return { ok: false };

  return {
    ok: true,
    data: {
      origin: places.data.origin,
      destination: places.data.destination,
      tripId: trip,
    },
  };
}

// Builds the address of a trip page from places and a trip id we already have.
export function buildTripHref(
  origin: Point,
  destination: Point,
  tripId: string,
): string {
  const params = new URLSearchParams({
    olat: String(origin.lat),
    olng: String(origin.lng),
    dlat: String(destination.lat),
    dlng: String(destination.lng),
    trip: tripId,
  });
  return `/trip?${params.toString()}`;
}
