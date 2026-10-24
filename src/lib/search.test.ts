import { describe, expect, it } from "vitest";
import routesJson from "../data/routes.json";
import routeStopsJson from "../data/route-stops.json";
import segmentsJson from "../data/segments.json";
import stopsJson from "../data/stops.json";
import { NetworkSchema, type Segment, type Stop } from "./domain";
import { sortJourneys } from "./ranking";
import { searchTrips } from "./search";
import { summarizeJourney } from "./summary";

const network = NetworkSchema.parse({
  stops: stopsJson,
  routes: routesJson,
  route_stops: routeStopsJson,
  segments: segmentsJson,
});

// Real coordinates from stops.json.
const ishaga = { lat: 6.533, lng: 3.329 };
const hospital = { lat: 6.53, lng: 3.379 };
// Inside Lagos, but with no stop within a kilometre.
const farAway = { lat: 6.7, lng: 3.5 };

describe("searchTrips", () => {
  it("finds the two prototype journeys when standing at the stops", () => {
    const trips = searchTrips(network, ishaga, hospital, {
      maxWalkMeters: 300,
    });
    expect(trips).toHaveLength(2);

    const [viaMushin, viaOshodi] = trips;
    expect(viaMushin.journey.id.startsWith("seg_keke_ishaga_mushin")).toBe(
      true,
    );
    expect(viaMushin.badges).toEqual(["cheapest"]);
    expect(viaMushin.access.stop.id).toBe("stop_ishaga");
    expect(viaMushin.access.walkMinutes).toBe(0);
    expect(viaMushin.egress.stop.id).toBe("stop_hospital");
    expect(viaMushin.summary.timeMin).toBe(51);
    expect(viaMushin.summary.timeMax).toBe(95);

    expect(viaOshodi.badges).toEqual(["fastest"]);
    // The tab sorting keeps the extra walking details on each result.
    expect(sortJourneys(trips, "fastest")[0].access.stop.id).toBe(
      "stop_ishaga",
    );
  });

  it("adds the walk to the first stop to the journey time", () => {
    // About 400 m north of Ishaga, which is a 7 minute walk.
    const trips = searchTrips(network, { lat: 6.5366, lng: 3.329 }, hospital, {
      maxWalkMeters: 600,
    });
    const viaMushin = trips[0];
    expect(viaMushin.access.stop.id).toBe("stop_ishaga");
    expect(viaMushin.access.meters).toBe(400);
    expect(viaMushin.access.walkMinutes).toBe(7);
    expect(viaMushin.summary.timeMin).toBe(51 + 7);
    expect(viaMushin.summary.timeMax).toBe(95 + 7);
  });

  it("returns nothing when no stop is near the start", () => {
    expect(searchTrips(network, farAway, hospital)).toEqual([]);
  });

  it("returns nothing when no stop is near the destination", () => {
    expect(searchTrips(network, ishaga, farAway)).toEqual([]);
  });

  it("returns nothing for impossible coordinates or distances", () => {
    expect(
      searchTrips(network, { lat: Number.NaN, lng: 3.3 }, hospital),
    ).toEqual([]);
    expect(
      searchTrips(network, ishaga, hospital, { maxWalkMeters: Number.NaN }),
    ).toEqual([]);
  });

  it("returns nothing when both places are served by the same single stop", () => {
    expect(searchTrips(network, ishaga, ishaga)).toEqual([]);
  });

  it("keeps working, and stays small, when asked for silly amounts", () => {
    const trips = searchTrips(network, ishaga, hospital, {
      maxStopsPerEnd: 1000,
      maxWalkMeters: 1_000_000,
    });
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.length).toBeLessThanOrEqual(20);
  });

  it("ignores impossible extra walking minutes", () => {
    const journey = { id: "j", legs: [network.segments[0]] };
    const normal = summarizeJourney(journey);
    for (const bad of [-5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const summary = summarizeJourney({ ...journey, extraWalkMinutes: bad });
      expect(summary.timeMin).toBe(normal.timeMin);
      expect(summary.timeMax).toBe(normal.timeMax);
    }
    expect(summarizeJourney({ ...journey, extraWalkMinutes: 8 }).timeMin).toBe(
      normal.timeMin + 8,
    );
  });
});
describe("searchTrips near-duplicates", () => {
  it("does not list a trip that only stops short of another that reaches the destination by an explicit walk", () => {
    const trips = searchTrips(network, ishaga, hospital);
    expect(trips.map((trip) => trip.journey.id).sort()).toEqual([
      "seg_bus_ishaga_oshodi>seg_walk_oshodi_third_lane>seg_bus_third_lane_hospital",
      "seg_keke_ishaga_mushin>seg_bus_mushin_onipan>seg_walk_onipan_hospital",
    ]);
  });

  it("keeps the shorter trip when the data has no walk to finish it", () => {
    const withoutWalk = {
      stops: network.stops,
      segments: network.segments.filter(
        (segment) => segment.id !== "seg_walk_onipan_hospital",
      ),
    };
    const ids = searchTrips(withoutWalk, ishaga, hospital).map(
      (trip) => trip.journey.id,
    );
    expect(ids).toContain("seg_keke_ishaga_mushin>seg_bus_mushin_onipan");
  });

  it("keeps the shorter trip when the longer one would leave you farther away", () => {
    const stop = (id: string, lat: number, lng: number): Stop => ({
      id,
      name: id,
      area: "Test",
      lat,
      lng,
      type: "bus_stop",
    });
    const leg = (
      id: string,
      from: string,
      to: string,
      mode: Segment["mode"],
    ): Segment => ({
      id,
      route_id: mode === "walk" ? undefined : "r1",
      from_stop_id: from,
      to_stop_id: to,
      mode,
      description: id,
      time_min: 5,
      time_max: 10,
      fare_type: mode === "walk" ? "fixed" : "range",
      fare_min: mode === "walk" ? 0 : 100,
      fare_max: mode === "walk" ? 0 : 200,
      source: "sample",
      confidence: "sample",
    });

    const s1 = stop("s1", 6.53, 3.3);
    const s2 = stop("s2", 6.53, 3.32);
    const s3 = stop("s3", 6.538, 3.32); // about 900 m north of s2
    const small = {
      stops: [s1, s2, s3],
      segments: [
        leg("ride", "s1", "s2", "bus"),
        leg("walk", "s2", "s3", "walk"),
      ],
    };

    // Riding to s2 and stopping there beats riding to s2 and then walking away from it.
    const trips = searchTrips(small, s1, s2);
    expect(trips.map((trip) => trip.journey.id).sort()).toEqual([
      "ride",
      "ride>walk",
    ]);
  });
});
