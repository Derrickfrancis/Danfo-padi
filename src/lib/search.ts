import type { Network } from "./domain";
import { findNearbyStops, type NearbyStop, type Point } from "./geo";
import { buildGraph } from "./graph";
import { findJourneys, type Journey } from "./journeys";
import { rankJourneys, type RankedJourney } from "./ranking";

// A ranked journey, plus the walk to its first stop and from its last stop.
export type TripOption = RankedJourney & {
  access: NearbyStop; // the stop to walk to first
  egress: NearbyStop; // the stop to get off at, and the walk from it
};

export type SearchOptions = {
  maxWalkMeters?: number; // how far a person will walk to or from a stop
  maxStopsPerEnd?: number; // how many nearby stops to try at each end
};

const DEFAULT_MAX_WALK_METERS = 1000;
const DEFAULT_STOPS_PER_END = 5;
const HARD_MAX_STOPS_PER_END = 8; // at most 8 x 8 = 64 pairs to search
const MAX_RESULTS = 20;

// Finds and ranks every way to get from one place to another.
// It takes the network as an argument, so it works with any data and is easy to test.
export function searchTrips(
  network: Pick<Network, "stops" | "segments">,
  origin: Point,
  destination: Point,
  options: SearchOptions = {},
): TripOption[] {
  const maxWalk = options.maxWalkMeters ?? DEFAULT_MAX_WALK_METERS;
  const requested = options.maxStopsPerEnd ?? DEFAULT_STOPS_PER_END;
  const perEnd = Number.isFinite(requested)
    ? Math.min(Math.max(Math.floor(requested), 1), HARD_MAX_STOPS_PER_END)
    : DEFAULT_STOPS_PER_END;

  const startStops = findNearbyStops(origin, network.stops, maxWalk, perEnd);
  const endStops = findNearbyStops(destination, network.stops, maxWalk, perEnd);
  if (startStops.length === 0 || endStops.length === 0) return [];

  const graph = buildGraph(network.segments);
  const trips = new Map<
    string,
    { journey: Journey; access: NearbyStop; egress: NearbyStop }
  >();

  for (const access of startStops) {
    for (const egress of endStops) {
      if (access.stop.id === egress.stop.id) continue;
      for (const journey of findJourneys(
        graph,
        access.stop.id,
        egress.stop.id,
      )) {
        const withWalking: Journey = {
          ...journey,
          extraWalkMinutes: access.walkMinutes + egress.walkMinutes,
        };
        trips.set(journey.id, { journey: withWalking, access, egress });
      }
    }
  }

  const ranked = rankJourneys([...trips.values()].map((trip) => trip.journey));

  return ranked.slice(0, MAX_RESULTS).flatMap((item) => {
    const trip = trips.get(item.journey.id);
    return trip ? [{ ...item, access: trip.access, egress: trip.egress }] : [];
  });
}
