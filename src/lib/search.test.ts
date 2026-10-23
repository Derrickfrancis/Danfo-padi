import { describe, expect, it } from "vitest";
import routesJson from "../data/routes.json";
import routeStopsJson from "../data/route-stops.json";
import segmentsJson from "../data/segments.json";
import stopsJson from "../data/stops.json";
import { NetworkSchema } from "./domain";
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
