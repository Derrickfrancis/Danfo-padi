import { describe, expect, it } from "vitest";
import segmentsJson from "./fixtures/sample/segments.json";
import { SegmentSchema, type Segment } from "./domain";
import { buildGraph } from "./graph";
import { findJourneys } from "./journeys";

// A small fake leg, so each test says only what it cares about.
function makeSegment(
  id: string,
  from: string,
  to: string,
  mode: Segment["mode"] = "bus",
): Segment {
  return {
    id,
    route_id: "r1",
    from_stop_id: from,
    to_stop_id: to,
    mode,
    description: id,
    time_min: 5,
    time_max: 10,
    fare_type: "range",
    fare_min: 100,
    fare_max: 200,
    source: "sample",
    confidence: "sample",
  };
}

describe("findJourneys with the Isolo sample data", () => {
  const graph = buildGraph(SegmentSchema.array().parse(segmentsJson));

  it("finds the two journeys from the prototype: Via Oshodi and Via Mushin", () => {
    const journeys = findJourneys(graph, "stop_ishaga", "stop_hospital");
    expect(journeys.map((j) => j.id)).toEqual([
      "seg_bus_ishaga_oshodi>seg_walk_oshodi_third_lane>seg_bus_third_lane_hospital",
      "seg_keke_ishaga_mushin>seg_bus_mushin_onipan>seg_walk_onipan_hospital",
    ]);
  });

  it("starts and ends where asked, and every leg picks up where the last one stopped", () => {
    for (const journey of findJourneys(graph, "stop_ishaga", "stop_hospital")) {
      expect(journey.legs[0].from_stop_id).toBe("stop_ishaga");
      expect(journey.legs.at(-1)?.to_stop_id).toBe("stop_hospital");
      for (let i = 1; i < journey.legs.length; i++) {
        expect(journey.legs[i].from_stop_id).toBe(
          journey.legs[i - 1].to_stop_id,
        );
      }
    }
  });

  it("finds nothing when only one ride is allowed, since both journeys need a transfer", () => {
    expect(
      findJourneys(graph, "stop_ishaga", "stop_hospital", { maxRides: 1 }),
    ).toEqual([]);
  });
});

describe("findJourneys rules", () => {
  it("returns nothing when the start and end are the same stop", () => {
    const graph = buildGraph([makeSegment("ab", "A", "B")]);
    expect(findJourneys(graph, "A", "A")).toEqual([]);
  });

  it("returns nothing for stops it has never heard of", () => {
    const graph = buildGraph([makeSegment("ab", "A", "B")]);
    expect(findJourneys(graph, "nowhere", "B")).toEqual([]);
    expect(findJourneys(graph, "A", "nowhere")).toEqual([]);
  });

  it("never goes in circles", () => {
    const graph = buildGraph([
      makeSegment("ab", "A", "B"),
      makeSegment("ba", "B", "A"),
      makeSegment("bc", "B", "C"),
    ]);
    expect(findJourneys(graph, "A", "C").map((j) => j.id)).toEqual(["ab>bc"]);
  });

  it("stops as soon as it reaches the destination", () => {
    const graph = buildGraph([
      makeSegment("ab", "A", "B"),
      makeSegment("bc", "B", "C"),
    ]);
    expect(findJourneys(graph, "A", "B").map((j) => j.id)).toEqual(["ab"]);
  });

  it("returns nothing when there is no way to get there", () => {
    const graph = buildGraph([
      makeSegment("ab", "A", "B"),
      makeSegment("bc", "B", "C"),
    ]);
    expect(findJourneys(graph, "C", "A")).toEqual([]);
  });

  it("allows one transfer by default, and more only when asked", () => {
    const graph = buildGraph([
      makeSegment("ab", "A", "B"),
      makeSegment("bc", "B", "C"),
      makeSegment("cd", "C", "D"),
    ]);
    expect(findJourneys(graph, "A", "C").map((j) => j.id)).toEqual(["ab>bc"]);
    expect(findJourneys(graph, "A", "D")).toEqual([]);
    expect(
      findJourneys(graph, "A", "D", { maxRides: 3 }).map((j) => j.id),
    ).toEqual(["ab>bc>cd"]);
  });

  it("stops after the number of journeys asked for", () => {
    const graph = buildGraph([
      makeSegment("ab1", "A", "B"),
      makeSegment("ab2", "A", "B"),
    ]);
    expect(findJourneys(graph, "A", "B")).toHaveLength(2);
    expect(findJourneys(graph, "A", "B", { maxJourneys: 1 })).toHaveLength(1);
  });

  it("ignores silly limits: a huge number is capped, and a non-number falls back to the default", () => {
    const graph = buildGraph([
      makeSegment("ab", "A", "B"),
      makeSegment("bc", "B", "C"),
      makeSegment("cd", "C", "D"),
      makeSegment("de", "D", "E"),
    ]);
    expect(findJourneys(graph, "A", "D", { maxRides: Number.NaN })).toEqual([]);
    expect(findJourneys(graph, "A", "E", { maxRides: 1000 })).toEqual([]);
    expect(
      findJourneys(graph, "A", "D", { maxRides: 1000 }).map((j) => j.id),
    ).toEqual(["ab>bc>cd"]);
  });
});
