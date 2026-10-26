import type { Segment } from "./domain";
import type { NearbyStop } from "./geo";
import type { TripOption } from "./search";

// 1200 becomes "1,200".
export function withThousands(amount: number): string {
  return String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// "₦600–900", or just "₦500" when the low and high are the same.
export function formatNaira(min: number, max: number): string {
  if (min === max) return `₦${withThousands(min)}`;
  return `₦${withThousands(min)}–${withThousands(max)}`;
}

// "51–95 min", or "5 min" when the low and high are the same.
export function formatMinutes(min: number, max: number): string {
  if (min === max) return `${min} min`;
  return `${min}–${max} min`;
}

// The small label on a leg: KEKE, BUS, WALK, BRT...
export function modeTag(mode: Segment["mode"]): string {
  return mode.toUpperCase();
}

// A journey's fare is an estimate if any of its legs has a range, not a fixed price.
export function isEstimate(legs: readonly Segment[]): boolean {
  return legs.some((leg) => leg.fare_type === "range");
}

export function formatLegFare(leg: Segment): string {
  if (leg.mode === "walk") return "No fare";
  return formatNaira(leg.fare_min, leg.fare_max);
}

// How far to trust a fare, in words a rider understands.
export function confidenceLabel(confidence: Segment["confidence"]): string {
  switch (confidence) {
    case "sample":
      return "Sample estimate, not yet verified";
    case "low":
      return "Based on one report";
    case "medium":
      return "Reported by several riders";
    case "high":
      return "Verified fare";
  }
}

// The card title: "Via Mushin", "Direct" or "Walk". The name comes from our own stop data.
export function viaLabel(
  legs: readonly Segment[],
  stopName: (id: string) => string | undefined,
): string {
  const rides = legs.filter((leg) => leg.mode !== "walk");
  if (rides.length === 0) return "Walk";
  if (rides.length === 1) return "Direct";
  const name = stopName(rides[0].to_stop_id);
  return name ? `Via ${name}` : "With a transfer";
}

// "First get to Ishaga bus stop", plus the walk if it is more than a step.
export function describeStart(access: NearbyStop): string {
  const base = `First get to ${access.stop.name}`;
  return access.walkMinutes > 0
    ? `${base} (about ${access.walkMinutes} min walk)`
    : base;
}

// One line of a route card.
export type TripRow = { key: string; tag: string; text: string; fare: string };

// The lines of a card: the walk to the first stop, each leg, and the walk from the last stop.
// Everything shown comes from our own data, never from the address.
export function buildTripRows(
  trip: Pick<TripOption, "journey" | "access" | "egress">,
): TripRow[] {
  const rows: TripRow[] = [];

  if (trip.access.walkMinutes > 0) {
    rows.push({
      key: "walk-to-start",
      tag: "WALK",
      text: `Walk to ${trip.access.stop.name} (about ${trip.access.walkMinutes} min)`,
      fare: "No fare",
    });
  }

  for (const leg of trip.journey.legs) {
    rows.push({
      key: leg.id,
      tag: modeTag(leg.mode),
      text: leg.description,
      fare: formatLegFare(leg),
    });
  }

  if (trip.egress.walkMinutes > 0) {
    rows.push({
      key: "walk-from-end",
      tag: "WALK",
      text: `Walk from ${trip.egress.stop.name} to your destination (about ${trip.egress.walkMinutes} min)`,
      fare: "No fare",
    });
  }

  return rows;
}

// "Get off at National Orthopaedic Hospital", plus the walk if it is more than a step.
export function describeEnd(egress: NearbyStop): string {
  const base = `Get off at ${egress.stop.name}`;
  return egress.walkMinutes > 0
    ? `${base}, then walk about ${egress.walkMinutes} min`
    : base;
}
