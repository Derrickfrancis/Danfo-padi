import "server-only";

import type { Network, Route, RouteStop, Segment, Stop } from "./domain";
import { checkNetwork } from "./network-checks";
import routesJson from "@/data/routes.json";
import routeStopsJson from "@/data/route-stops.json";
import segmentsJson from "@/data/segments.json";
import stopsJson from "@/data/stops.json";

/* ---------- Loading the data ---------- */

let cached: Network | null = null;

// Reads the four files, checks them, and keeps the result in memory.
// If anything is wrong we stop with a clear message instead of using bad data.
function load(): Network {
  if (cached) return cached;

  const { network, problems } = checkNetwork({
    stops: stopsJson,
    routes: routesJson,
    route_stops: routeStopsJson,
    segments: segmentsJson,
  });

  if (!network || problems.length > 0) {
    throw new Error(
      `Route data has problems:\n${problems.slice(0, 5).join("\n")}`,
    );
  }

  cached = network;
  return cached;
}

/* ---------- What the rest of the app uses ---------- */

// These are async on purpose. Reading from Supabase will be async, so the
// code that calls these will not need to change when we switch.

export async function getNetwork(): Promise<Network> {
  return load();
}

export async function getStops(): Promise<Stop[]> {
  return load().stops;
}

export async function getStop(id: string): Promise<Stop | undefined> {
  return load().stops.find((stop) => stop.id === id);
}

export async function getRoutes(): Promise<Route[]> {
  return load().routes;
}

export async function getRouteStops(): Promise<RouteStop[]> {
  return load().route_stops;
}

export async function getSegments(): Promise<Segment[]> {
  return load().segments;
}
