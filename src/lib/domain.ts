import { z } from "zod";

/* ---------- Small building blocks ---------- */

// An id is short text such as "stop_ishaga". The length limit stops anyone
// from sending a huge value pretending to be an id.
const Id = z.string().min(1).max(64);

// Money is whole naira. The ceiling catches typos such as an extra zero.
const Naira = z.number().int().min(0).max(100000);

// Ride times are whole minutes, up to 5 hours.
const Minutes = z.number().int().min(0).max(300);

// A date written as 2026-10-22.
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD");

/* ---------- Either-or values ---------- */

// How a leg of the trip is travelled. "bus" covers danfo and other buses.
export const Mode = z.enum(["walk", "keke", "bus", "brt", "rail", "ferry"]);

export const StopType = z.enum([
  "bus_stop",
  "brt_station",
  "keke_park",
  "rail_station",
  "jetty",
]);

// "fixed" is an official price. "range" is a low to high estimate.
export const FareType = z.enum(["fixed", "range"]);

// Where a fare came from, and how far we trust it.
export const FareSource = z.enum([
  "official",
  "survey",
  "user_report",
  "sample",
]);
export const Confidence = z.enum(["sample", "low", "medium", "high"]);

/* ---------- Shapes of our data ---------- */

// A place where people board or get off.
export const StopSchema = z.object({
  id: Id,
  name: z.string().min(1).max(120),
  local_alias: z.string().max(120).optional(),
  // Launch area is Lagos. These limits catch swapped or mistyped coordinates.
  // Widen them when we add other states.
  lat: z.number().min(6.2).max(6.9),
  lng: z.number().min(2.6).max(4.5),
  area: z.string().min(1).max(80),
  type: StopType,
});

// A transport line, such as one keke or bus service between stops.
export const RouteSchema = z.object({
  id: Id,
  name: z.string().min(1).max(120),
  mode: Mode,
});

// Says which stops a route serves, and in what order.
export const RouteStopSchema = z.object({
  route_id: Id,
  stop_id: Id,
  sequence: z.number().int().min(0).max(500),
});

// One rideable or walkable leg between two stops, with its time and fare.
export const SegmentSchema = z
  .object({
    id: Id,
    route_id: Id.optional(), // walking legs belong to no route
    from_stop_id: Id,
    to_stop_id: Id,
    mode: Mode,
    description: z.string().min(1).max(200),
    time_min: Minutes,
    time_max: Minutes,
    fare_type: FareType,
    fare_min: Naira,
    fare_max: Naira,
    source: FareSource,
    confidence: Confidence,
    verified_at: IsoDate.optional(),
  })
  .refine((s) => s.time_min <= s.time_max, {
    message: "time_min must not be more than time_max",
    path: ["time_max"],
  })
  .refine((s) => s.fare_min <= s.fare_max, {
    message: "fare_min must not be more than fare_max",
    path: ["fare_max"],
  })
  .refine((s) => s.fare_type !== "fixed" || s.fare_min === s.fare_max, {
    message: "A fixed fare must have the same minimum and maximum",
    path: ["fare_max"],
  });

// Everything together, as it will sit in our data files.
export const NetworkSchema = z.object({
  stops: z.array(StopSchema),
  routes: z.array(RouteSchema),
  route_stops: z.array(RouteStopSchema),
  segments: z.array(SegmentSchema),
});

/* ---------- Types made from the shapes ---------- */

export type Mode = z.infer<typeof Mode>;
export type Stop = z.infer<typeof StopSchema>;
export type Route = z.infer<typeof RouteSchema>;
export type RouteStop = z.infer<typeof RouteStopSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Network = z.infer<typeof NetworkSchema>;
