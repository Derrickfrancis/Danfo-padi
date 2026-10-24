import { describe, expect, it } from "vitest";
import routesJson from "../data/routes.json";
import routeStopsJson from "../data/route-stops.json";
import segmentsJson from "../data/segments.json";
import stopsJson from "../data/stops.json";
import { NetworkSchema, type Segment, type Stop } from "./domain";
import { searchTrips } from "./search";
import {
  buildTripRows,
  confidenceLabel,
  describeStart,
  formatLegFare,
  formatMinutes,
  formatNaira,
  isEstimate,
  modeTag,
  viaLabel,
  withThousands,
} from "./trip-format";

const network = NetworkSchema.parse({
  stops: stopsJson,
  routes: routesJson,
  route_stops: routeStopsJson,
  segments: segmentsJson,
});

// Look things up by id, and fail loudly if a test asks for something that is not there.
function segment(id: string): Segment {
  const found = network.segments.find((s) => s.id === id);
  if (!found) throw new Error(`Missing test segment: ${id}`);
  return found;
}

function stop(id: string): Stop {
  const found = network.stops.find((s) => s.id === id);
  if (!found) throw new Error(`Missing test stop: ${id}`);
  return found;
}

const stopName = (id: string) => network.stops.find((s) => s.id === id)?.name;
const hospital = { lat: 6.53, lng: 3.379 };

describe("number and time formatting", () => {
  it("puts commas in thousands", () => {
    expect([0, 999, 1000, 1200, 100000].map(withThousands)).toEqual([
      "0",
      "999",
      "1,000",
      "1,200",
      "100,000",
    ]);
  });

  it("writes naira as a range, or a single price when low and high match", () => {
    expect(formatNaira(600, 900)).toBe("₦600–900");
    expect(formatNaira(900, 1200)).toBe("₦900–1,200");
    expect(formatNaira(500, 500)).toBe("₦500");
  });

  it("writes minutes as a range, or a single time when low and high match", () => {
    expect(formatMinutes(51, 95)).toBe("51–95 min");
    expect(formatMinutes(5, 5)).toBe("5 min");
  });

  it("writes every mode as a capital-letter tag", () => {
    const modes = ["walk", "keke", "bus", "brt", "rail", "ferry"] as const;
    expect(modes.map(modeTag)).toEqual([
      "WALK",
      "KEKE",
      "BUS",
      "BRT",
      "RAIL",
      "FERRY",
    ]);
  });
});

describe("fares and trust", () => {
  it("calls a fare an estimate when any leg is a range", () => {
    expect(isEstimate([segment("seg_keke_ishaga_mushin")])).toBe(true);
    expect(isEstimate([segment("seg_walk_onipan_hospital")])).toBe(false);
    expect(isEstimate([])).toBe(false);
  });

  it("shows a walk as no fare, and a ride as its range or fixed price", () => {
    expect(formatLegFare(segment("seg_walk_onipan_hospital"))).toBe("No fare");
    expect(formatLegFare(segment("seg_keke_ishaga_mushin"))).toBe("₦300–500");
    const fixed = {
      ...segment("seg_keke_ishaga_mushin"),
      fare_type: "fixed" as const,
      fare_min: 500,
      fare_max: 500,
    };
    expect(formatLegFare(fixed)).toBe("₦500");
  });

  it("describes each level of trust in words", () => {
    expect(
      (["sample", "low", "medium", "high"] as const).map(confidenceLabel),
    ).toEqual([
      "Sample estimate, not yet verified",
      "Based on one report",
      "Reported by several riders",
      "Verified fare",
    ]);
  });
});

describe("card titles and the starting line", () => {
  it("names a trip after the stop where you change", () => {
    const viaMushin = [
      segment("seg_keke_ishaga_mushin"),
      segment("seg_bus_mushin_onipan"),
      segment("seg_walk_onipan_hospital"),
    ];
    const viaOshodi = [
      segment("seg_bus_ishaga_oshodi"),
      segment("seg_walk_oshodi_third_lane"),
      segment("seg_bus_third_lane_hospital"),
    ];
    expect(viaLabel(viaMushin, stopName)).toBe("Via Mushin");
    expect(viaLabel(viaOshodi, stopName)).toBe("Via Oshodi");
  });

  it("calls a single ride direct, a walk a walk, and copes with an unknown stop", () => {
    expect(viaLabel([segment("seg_keke_ishaga_mushin")], stopName)).toBe(
      "Direct",
    );
    expect(viaLabel([segment("seg_walk_onipan_hospital")], stopName)).toBe(
      "Walk",
    );
    const twoRides = [
      segment("seg_keke_ishaga_mushin"),
      segment("seg_bus_mushin_onipan"),
    ];
    expect(viaLabel(twoRides, () => undefined)).toBe("With a transfer");
  });

  it("says where to go first, and mentions the walk only when there is one", () => {
    const ishaga = stop("stop_ishaga");
    expect(describeStart({ stop: ishaga, meters: 0, walkMinutes: 0 })).toBe(
      "First get to Ishaga bus stop",
    );
    expect(describeStart({ stop: ishaga, meters: 400, walkMinutes: 7 })).toBe(
      "First get to Ishaga bus stop (about 7 min walk)",
    );
  });
});

describe("buildTripRows", () => {
  it("lists each leg with its tag and fare", () => {
    const [best] = searchTrips(network, { lat: 6.533, lng: 3.329 }, hospital);
    const rows = buildTripRows(best);
    expect(rows.map((row) => row.tag)).toEqual(["KEKE", "BUS", "WALK"]);
    expect(rows.map((row) => row.fare)).toEqual([
      "₦300–500",
      "₦300–400",
      "No fare",
    ]);
    expect(rows[0].text).toBe("Ishaga to Mushin (keke or korope)");
  });

  it("adds a walk to the first stop when it is more than a step away", () => {
    // About 400 m north of Ishaga, a 7 minute walk.
    const [best] = searchTrips(network, { lat: 6.5366, lng: 3.329 }, hospital, {
      maxWalkMeters: 600,
    });
    const rows = buildTripRows(best);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual({
      key: "walk-to-start",
      tag: "WALK",
      text: "Walk to Ishaga bus stop (about 7 min)",
      fare: "No fare",
    });
  });
});
