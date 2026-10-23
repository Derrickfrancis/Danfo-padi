import { z } from "zod";
import type { Segment } from "./domain";
import type { TripOption } from "./search";

/* ---------- Incoming requests ---------- */

// Launch area. Same limits as the stop coordinates in domain.ts.
export const LAGOS_BOUNDS = {
  minLat: 6.2,
  maxLat: 6.9,
  minLng: 2.6,
  maxLng: 4.5,
} as const;

// "Strict" means any field we did not ask for is refused, not quietly ignored.
const PointSchema = z.strictObject({
  lat: z.number().min(LAGOS_BOUNDS.minLat).max(LAGOS_BOUNDS.maxLat),
  lng: z.number().min(LAGOS_BOUNDS.minLng).max(LAGOS_BOUNDS.maxLng),
});

export const SearchRequestSchema = z.strictObject({
  origin: PointSchema,
  destination: PointSchema,
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

// A real request is about 100 characters. Anything much bigger is not one.
export const MAX_BODY_CHARS = 2000;

// Either it worked and here is the clean data, or it did not and here is why.
export type ParseResult =
  | { ok: true; data: SearchRequest }
  | {
      ok: false;
      error: "too_large" | "invalid_json" | "invalid_request";
      fields: string[];
    };

export function parseSearchRequest(bodyText: string): ParseResult {
  // Check the size first, before doing any work on the text.
  if (bodyText.length > MAX_BODY_CHARS) {
    return { ok: false, error: "too_large", fields: [] };
  }

  let json: unknown;
  try {
    json = JSON.parse(bodyText);
  } catch {
    return { ok: false, error: "invalid_json", fields: [] };
  }

  const result = SearchRequestSchema.safeParse(json);
  if (!result.success) {
    // Report which fields are wrong, but never what was typed into them.
    const fields = result.error.issues
      .slice(0, 5)
      .map((issue) => issue.path.map(String).join(".") || "(request)");
    return {
      ok: false,
      error: "invalid_request",
      fields: [...new Set(fields)],
    };
  }

  return { ok: true, data: result.data };
}

/* ---------- Outgoing results ---------- */

// The exact shape the screens will receive. Only fields listed here leave the server.

export type LegDto = {
  id: string;
  mode: Segment["mode"];
  description: string;
  fromStopId: string;
  toStopId: string;
  timeMin: number;
  timeMax: number;
  fareMin: number;
  fareMax: number;
  fareType: Segment["fare_type"];
  source: Segment["source"];
  confidence: Segment["confidence"];
};

export type StopWalkDto = {
  stopId: string;
  name: string;
  meters: number;
  walkMinutes: number;
};

export type TripDto = {
  id: string;
  isBest: boolean;
  badges: string[];
  reason: string;
  score: number;
  timeMin: number;
  timeMax: number;
  fareMin: number;
  fareMax: number;
  rides: number;
  walks: number;
  transfers: number;
  confidence: Segment["confidence"];
  access: StopWalkDto;
  egress: StopWalkDto;
  legs: LegDto[];
};

export function toTripDto(trip: TripOption): TripDto {
  return {
    id: trip.journey.id,
    isBest: trip.isBest,
    badges: [...trip.badges],
    reason: trip.reason,
    score: trip.score,
    timeMin: trip.summary.timeMin,
    timeMax: trip.summary.timeMax,
    fareMin: trip.summary.fareMin,
    fareMax: trip.summary.fareMax,
    rides: trip.summary.rides,
    walks: trip.summary.walks,
    transfers: trip.summary.transfers,
    confidence: trip.summary.confidence,
    access: {
      stopId: trip.access.stop.id,
      name: trip.access.stop.name,
      meters: trip.access.meters,
      walkMinutes: trip.access.walkMinutes,
    },
    egress: {
      stopId: trip.egress.stop.id,
      name: trip.egress.stop.name,
      meters: trip.egress.meters,
      walkMinutes: trip.egress.walkMinutes,
    },
    legs: trip.journey.legs.map((leg) => ({
      id: leg.id,
      mode: leg.mode,
      description: leg.description,
      fromStopId: leg.from_stop_id,
      toStopId: leg.to_stop_id,
      timeMin: leg.time_min,
      timeMax: leg.time_max,
      fareMin: leg.fare_min,
      fareMax: leg.fare_max,
      fareType: leg.fare_type,
      source: leg.source,
      confidence: leg.confidence,
    })),
  };
}
