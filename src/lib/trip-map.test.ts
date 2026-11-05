import { describe, expect, it } from "vitest";
import routesJson from "../data/routes.json";
import routeStopsJson from "../data/route-stops.json";
import segmentsJson from "../data/segments.json";
import stopsJson from "../data/stops.json";
import { NetworkSchema } from "./domain";
import { searchTrips } from "./search";
import { buildTripMap } from "./trip-map";

const network = NetworkSchema.parse({
  stops: stopsJson,
  routes: routesJson,
  route_stops: routeStopsJson,
  segments: segmentsJson,
});
const stopById = (id: string) => network.stops.find((stop) => stop.id === id);

const ishaga = { lat: 6.533, lng: 3.329 };
const hospital = { lat: 6.53, lng: 3.379 };

// The trip that ends with a given leg, so these tests do not depend on how trips are ranked.
function tripEndingWith(trips: ReturnType<typeof searchTrips>, legId: string) {
  const found = trips.find((trip) => trip.journey.legs.at(-1)?.id === legId);
  if (!found) throw new Error(`No trip ends with ${legId}`);
  return found;
}

describe("buildTripMap", () => {
  it("draws the trip through every stop, naming each one", () => {
    const viaMushin = tripEndingWith(
      searchTrips(network, ishaga, hospital),
      "seg_walk_onipan_hospital",
    );
    const map = buildTripMap(viaMushin, stopById, ishaga, hospital);

    // The start and end are the same spots as stops, so they are named, not repeated.
    expect(map.stops.map((stop) => stop.label)).toEqual([
      "Ishaga bus stop",
      "Mushin",
      "Onipan",
      "National Orthopaedic Hospital",
    ]);
    expect(map.path).toEqual(map.stops.map(({ lat, lng }) => ({ lat, lng })));
  });

  it("adds the person's own start and end when they are somewhere else", () => {
    const farStart = { lat: 6.5366, lng: 3.329 }; // about 400 m north of Ishaga
    const farEnd = { lat: 6.5336, lng: 3.379 }; // about 400 m north of the hospital
    const viaMushin = tripEndingWith(
      searchTrips(network, farStart, farEnd, { maxWalkMeters: 600 }),
      "seg_walk_onipan_hospital",
    );
    const map = buildTripMap(viaMushin, stopById, farStart, farEnd);

    expect(map.stops[0].label).toBe("Your start");
    expect(map.stops.at(-1)?.label).toBe("Your destination");
    expect(map.stops).toHaveLength(6);
    expect(map.path).toHaveLength(6);
  });

  it("skips a stop it cannot find instead of failing", () => {
    const viaMushin = tripEndingWith(
      searchTrips(network, ishaga, hospital),
      "seg_walk_onipan_hospital",
    );
    const withoutMushin = (id: string) =>
      id === "stop_mushin" ? undefined : stopById(id);
    const map = buildTripMap(viaMushin, withoutMushin, ishaga, hospital);
    expect(map.stops.map((stop) => stop.label)).toEqual([
      "Ishaga bus stop",
      "Onipan",
      "National Orthopaedic Hospital",
    ]);
  });

  it("never puts two dots on the same spot in a row", () => {
    for (const trip of searchTrips(network, ishaga, hospital)) {
      const { stops } = buildTripMap(trip, stopById, ishaga, hospital);
      for (let i = 1; i < stops.length; i++) {
        const same =
          Math.abs(stops[i].lat - stops[i - 1].lat) < 0.00002 &&
          Math.abs(stops[i].lng - stops[i - 1].lng) < 0.00002;
        expect(same).toBe(false);
      }
    }
  });
});
