import { NetworkSchema, type Network, type Route } from "./domain";

// The result of checking data: the clean data if it is usable, and a plain list of problems.
export type NetworkCheck = { network: Network | null; problems: string[] };

const MAX_SHAPE_PROBLEMS = 10;

// ["segments", 2, "fare_max"] becomes "segments[2].fare_max".
function formatPath(path: readonly PropertyKey[]): string {
  let text = "";
  for (const part of path) {
    if (typeof part === "number") text += `[${part}]`;
    else text += text === "" ? String(part) : `.${String(part)}`;
  }
  return text === "" ? "(data)" : text;
}

// For "segments[2]" this finds the id of that item in the raw data, so the message can
// say which one it is. Raw data may be anything, so every step is checked.
function itemId(
  raw: unknown,
  path: readonly PropertyKey[],
): string | undefined {
  const [table, index] = path;
  if (typeof table !== "string" || typeof index !== "number") return undefined;
  if (typeof raw !== "object" || raw === null) return undefined;
  const list: unknown = (raw as Record<string, unknown>)[table];
  if (!Array.isArray(list)) return undefined;
  const item: unknown = list[index];
  if (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    typeof item.id === "string"
  ) {
    return item.id;
  }
  return undefined;
}

// Step 1: does every item have the right fields and sensible values?
function checkShape(raw: unknown): NetworkCheck {
  const result = NetworkSchema.safeParse(raw);
  if (result.success) return { network: result.data, problems: [] };

  const issues = result.error.issues;
  const problems = issues.slice(0, MAX_SHAPE_PROBLEMS).map((issue) => {
    const id = itemId(raw, issue.path);
    return `${formatPath(issue.path)}${id ? ` (id: ${id})` : ""}: ${issue.message}`;
  });
  if (issues.length > MAX_SHAPE_PROBLEMS) {
    problems.push(`...and ${issues.length - MAX_SHAPE_PROBLEMS} more`);
  }
  return { network: null, problems };
}

function findDuplicates(label: string, ids: string[]): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) problems.push(`Duplicate ${label} id: ${id}`);
    seen.add(id);
  }
  return problems;
}

// Step 2: do the items agree with each other, and is it clear where each fare came from?
// `today` is optional ("2026-10-25"). Only when it is given do we check for dates in the future.
export function findNetworkProblems(
  network: Network,
  today?: string,
): string[] {
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

  const stopIds = new Set(network.stops.map((s) => s.id));
  const routeById = new Map<string, Route>(
    network.routes.map((r) => [r.id, r]),
  );

  // Where each stop sits on each route. The key looks like "route_id|stop_id".
  const sequenceOf = new Map<string, number>();
  const positionsSeen = new Set<string>();
  const stopsOnRoute = new Map<string, number>();

  for (const rs of network.route_stops) {
    if (!routeById.has(rs.route_id))
      problems.push(`route_stops uses unknown route: ${rs.route_id}`);
    if (!stopIds.has(rs.stop_id))
      problems.push(`route_stops uses unknown stop: ${rs.stop_id}`);

    const key = `${rs.route_id}|${rs.stop_id}`;
    if (sequenceOf.has(key))
      problems.push(`Stop ${rs.stop_id} appears twice on route ${rs.route_id}`);
    sequenceOf.set(key, rs.sequence);

    const positionKey = `${rs.route_id}|${rs.sequence}`;
    if (positionsSeen.has(positionKey)) {
      problems.push(
        `Route ${rs.route_id} has two stops at position ${rs.sequence}`,
      );
    }
    positionsSeen.add(positionKey);

    stopsOnRoute.set(rs.route_id, (stopsOnRoute.get(rs.route_id) ?? 0) + 1);
  }

  for (const route of network.routes) {
    if ((stopsOnRoute.get(route.id) ?? 0) < 2) {
      problems.push(
        `Route ${route.id} needs at least two stops in route_stops`,
      );
    }
  }

  for (const seg of network.segments) {
    if (!stopIds.has(seg.from_stop_id))
      problems.push(`${seg.id}: unknown from_stop_id ${seg.from_stop_id}`);
    if (!stopIds.has(seg.to_stop_id))
      problems.push(`${seg.id}: unknown to_stop_id ${seg.to_stop_id}`);
    if (seg.from_stop_id === seg.to_stop_id)
      problems.push(`${seg.id}: starts and ends at the same stop`);

    // Where did this come from, and when was it checked?
    if ((seg.source === "sample") !== (seg.confidence === "sample")) {
      problems.push(
        `${seg.id}: source and confidence must both be "sample", or neither`,
      );
    }
    if (seg.source !== "sample" && !seg.verified_at) {
      problems.push(
        `${seg.id}: needs verified_at (the date it was checked), because it is not sample data`,
      );
    }
    if (today && seg.verified_at && seg.verified_at > today) {
      problems.push(`${seg.id}: verified_at is in the future`);
    }

    if (seg.mode === "walk") {
      if (seg.fare_max > 0)
        problems.push(`${seg.id}: a walking leg cannot have a fare`);
      continue;
    }

    // Anything that is not walking is a ride, and a ride belongs to a route.
    if (seg.fare_max === 0)
      problems.push(`${seg.id}: a ride must cost something (fare_max is 0)`);
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

// Checks everything: the shape first, and only if that is fine, how the pieces fit together.
export function checkNetwork(
  raw: unknown,
  options: { today?: string } = {},
): NetworkCheck {
  const shape = checkShape(raw);
  if (!shape.network) return shape;
  return {
    network: shape.network,
    problems: findNetworkProblems(shape.network, options.today),
  };
}
