import { describe, expect, it } from "vitest";
import type { Stop } from "./domain";
import { distanceMeters, findNearbyStops, walkingMinutes } from "./geo";

// A small fake stop, so each test says only what it cares about.
function makeStop(id: string, lat: number, lng: number): Stop {
  return { id, name: id, area: "Test", lat, lng, type: "bus_stop" };
}

const origin = { lat: 6.533, lng: 3.329 };

describe("distanceMeters", () => {
  it("is zero for the same point", () => {
    expect(distanceMeters(origin, origin)).toBe(0);
  });

  it("measures one degree of latitude as about 111 km", () => {
    const d = distanceMeters({ lat: 6, lng: 3 }, { lat: 7, lng: 3 });
    expect(Math.abs(d - 111_195)).toBeLessThan(200);
  });

  it("gives the same answer in either direction", () => {
    const a = { lat: 6.533, lng: 3.329 };
    const b = { lat: 6.556, lng: 3.344 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});

describe("walkingMinutes", () => {
  it("is zero for no distance", () => {
    expect(walkingMinutes(0)).toBe(0);
  });

  it("rounds up and allows for bendy roads", () => {
    expect(walkingMinutes(80)).toBe(2); // 80 m x 1.3 / 80 = 1.3, rounded up
  });
});

describe("findNearbyStops", () => {
  const near = makeStop("near", 6.534, 3.329); // about 111 m away
  const nearer = makeStop("nearer", 6.5335, 3.329); // about 56 m away
  const far = makeStop("far", 6.556, 3.329); // about 2.5 km away

  it("keeps only stops inside the walking distance", () => {
    const result = findNearbyStops(origin, [far, near]);
    expect(result.map((r) => r.stop.id)).toEqual(["near"]);
  });

  it("puts the nearest stop first", () => {
    const result = findNearbyStops(origin, [near, nearer]);
    expect(result.map((r) => r.stop.id)).toEqual(["nearer", "near"]);
  });

  it("reports distance and walking time", () => {
    const [first] = findNearbyStops(origin, [near]);
    expect(first.meters).toBeGreaterThan(100);
    expect(first.meters).toBeLessThan(125);
    expect(first.walkMinutes).toBe(2);
  });

  it("respects the limit", () => {
    const result = findNearbyStops(origin, [near, nearer], 1000, 1);
    expect(result).toHaveLength(1);
  });

  it("returns nothing for impossible coordinates", () => {
    expect(findNearbyStops({ lat: NaN, lng: 3.3 }, [near])).toEqual([]);
  });
});
