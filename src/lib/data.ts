import "server-only";

import {
  NetworkSchema,
  type Network,
  type Route,
  type RouteStop,
  type Segment,
  type Stop,
} from "./domain";
import routesJson from "@/data/routes.json";
import routeStopsJson from "@/data/route-stops.json";
import segmentsJson from "@/data/segments.json";
import stopsJson from "@/data/stops.json";

/* ---------- Checking the data ---------- */

// Returns a message for every id that appears twice in a list.
function findDuplicates(label: string, ids: string[]): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) problems.push(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
  return problems;
}

// The schemas check each item on its own. This checks that items agree with
// each other: every id used must exist, and a segment must match its route.
function findReferenceProblems(network: Network): string[] {
  const problems: string[] = [];

  problems.push(
    ...findDuplicates(
      "stop",
      network.stops.map((s) => s.id),
    ),
  );
  problems.push(
    ...findDuplicates(
      "route",
      network.routes.map((r) => r.id),
    ),
  );
  problems.push(
    ...findDuplicates(
      "segment",
      network.segments.map((s) => s.id),
    ),
  );

  const stopIds = new Set<string>();
  for (const stop of network.stops) stopIds.add(stop.id);

  const routeById = new Map<string, Route>();
  for (const route of network.routes) routeById.set(route.id, route);

  // Where each stop sits on each route. The key looks like "route_id|stop_id".
  const sequenceOf = new Map<string, number>();
  for (const rs of network.route_stops) {
    if (!routeById.has(rs.route_id)) {
      problems.push(`route_stops uses unknown route: ${rs.route_id}`);
    }
    if (!stopIds.has(rs.stop_id)) {
      problems.push(`route_stops uses unknown stop: ${rs.stop_id}`);
    }
    const key = `${rs.route_id}|${rs.stop_id}`;
    if (sequenceOf.has(key)) {
      problems.push(`Stop ${rs.stop_id} appears twice on route ${rs.route_id}`);
    }
    sequenceOf.set(key, rs.sequence);
  }

  for (const seg of network.segments) {
    if (!stopIds.has(seg.from_stop_id)) {
      problems.push(`${seg.id}: unknown from_stop_id ${seg.from_stop_id}`);
    }
    if (!stopIds.has(seg.to_stop_id)) {
      problems.push(`${seg.id}: unknown to_stop_id ${seg.to_stop_id}`);
    }
    if (seg.from_stop_id === seg.to_stop_id) {
      problems.push(`${seg.id}: starts and ends at the same stop`);
    }

    if (seg.mode === "walk") {
      if (seg.fare_max > 0)
        problems.push(`${seg.id}: a walking leg cannot have a fare`);
      continue;
    }

    // Anything that is not walking is a ride, and a ride belongs to a route.
    if (!seg.route_id) {
      problems.push(`${seg.id}: a ride must have a route_id`);
      continue;
    }
    const route = routeById.get(seg.route_id);
    if (!route) {
      problems.push(`${seg.id}: unknown route ${seg.route_id}`);
      continue;
    }
    if (route.mode !== seg.mode) {
      problems.push(
        `${seg.id}: mode ${seg.mode} does not match route mode ${route.mode}`,
      );
    }

    // Both ends must be on the route, and the ride must go forward along it.
    const fromSeq = sequenceOf.get(`${seg.route_id}|${seg.from_stop_id}`);
    const toSeq = sequenceOf.get(`${seg.route_id}|${seg.to_stop_id}`);
    if (fromSeq === undefined || toSeq === undefined) {
      problems.push(`${seg.id}: both stops must be on route ${seg.route_id}`);
    } else if (fromSeq >= toSeq) {
      problems.push(`${seg.id}: goes backwards along route ${seg.route_id}`);
    }
  }

  return problems;
}

/* ---------- Loading the data ---------- */

let cached: Network | null = null;

// Reads the four files, checks them, and keeps the result in memory.
// If anything is wrong we stop with a clear message instead of using bad data.
function load(): Network {
  if (cached) return cached;

  const result = NetworkSchema.safeParse({
    stops: stopsJson,
    routes: routesJson,
    route_stops: routeStopsJson,
    segments: segmentsJson,
  });

  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 5)
      .map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`);
    throw new Error(`Network data has the wrong shape:\n${issues.join("\n")}`);
  }

  const problems = findReferenceProblems(result.data);
  if (problems.length > 0) {
    throw new Error(
      `Network data does not add up:\n${problems.slice(0, 5).join("\n")}`,
    );
  }

  cached = result.data;
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
