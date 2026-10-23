import type { Segment } from "./domain";
import { legsFrom, type Graph } from "./graph";

// One way of getting from a start stop to an end stop: legs in order.
export type Journey = {
  id: string; // the leg ids joined with ">", so the same journey always has the same id
  legs: readonly Segment[];
  // Minutes of walking before and after the journey itself: from the person's
  // place to the first stop, and from the last stop to where they are going.
  // The search fills this in. A journey on its own does not have it.
  extraWalkMinutes?: number;
};

export type SearchLimits = {
  maxRides: number; // rides on a vehicle (a walk does not count)
  maxWalks: number;
  maxLegs: number;
  maxJourneys: number;
};

// One transfer means two rides, so the default is two rides.
export const DEFAULT_LIMITS: SearchLimits = {
  maxRides: 2,
  maxWalks: 2,
  maxLegs: 5,
  maxJourneys: 20,
};

// Whatever a caller asks for, we never go beyond these.
const HARD_CAPS: SearchLimits = {
  maxRides: 3,
  maxWalks: 4,
  maxLegs: 8,
  maxJourneys: 50,
};

function clampLimit(value: number, fallback: number, cap: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.floor(value), 0), cap);
}

// Finds every way from one stop to another using the graph.
export function findJourneys(
  graph: Graph,
  fromStopId: string,
  toStopId: string,
  overrides: Partial<SearchLimits> = {},
): Journey[] {
  const limits: SearchLimits = {
    maxRides: clampLimit(
      overrides.maxRides ?? DEFAULT_LIMITS.maxRides,
      DEFAULT_LIMITS.maxRides,
      HARD_CAPS.maxRides,
    ),
    maxWalks: clampLimit(
      overrides.maxWalks ?? DEFAULT_LIMITS.maxWalks,
      DEFAULT_LIMITS.maxWalks,
      HARD_CAPS.maxWalks,
    ),
    maxLegs: clampLimit(
      overrides.maxLegs ?? DEFAULT_LIMITS.maxLegs,
      DEFAULT_LIMITS.maxLegs,
      HARD_CAPS.maxLegs,
    ),
    maxJourneys: clampLimit(
      overrides.maxJourneys ?? DEFAULT_LIMITS.maxJourneys,
      DEFAULT_LIMITS.maxJourneys,
      HARD_CAPS.maxJourneys,
    ),
  };

  if (fromStopId === toStopId) return [];

  const found: Journey[] = [];
  const path: Segment[] = []; // the legs of the journey we are building right now
  const visited = new Set<string>([fromStopId]); // stops already on this path

  // Tries every leg out of a stop. When a leg leads somewhere new, it
  // calls itself from there, then steps back to try the next leg.
  function explore(stopId: string, rides: number, walks: number): void {
    if (path.length >= limits.maxLegs) return;

    for (const leg of legsFrom(graph, stopId)) {
      if (found.length >= limits.maxJourneys) return;
      if (visited.has(leg.to_stop_id)) continue; // never go in circles

      const isWalk = leg.mode === "walk";
      const nextRides = rides + (isWalk ? 0 : 1);
      const nextWalks = walks + (isWalk ? 1 : 0);
      if (nextRides > limits.maxRides || nextWalks > limits.maxWalks) continue;

      path.push(leg);
      visited.add(leg.to_stop_id);

      if (leg.to_stop_id === toStopId) {
        found.push({ id: path.map((l) => l.id).join(">"), legs: [...path] });
      } else {
        explore(leg.to_stop_id, nextRides, nextWalks);
      }

      path.pop();
      visited.delete(leg.to_stop_id);
    }
  }

  explore(fromStopId, 0, 0);

  return found.sort((a, b) => a.id.localeCompare(b.id));
}
