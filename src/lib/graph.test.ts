import { describe, expect, it } from "vitest";
import segmentsJson from "../data/segments.json";
import { SegmentSchema, type Segment } from "./domain";
import { buildGraph, legsFrom } from "./graph";

// A small fake leg, so each test says only what it cares about.
function makeSegment(id: string, from: string, to: string): Segment {
  return {
    id,
    route_id: "r1",
    from_stop_id: from,
    to_stop_id: to,
    mode: "bus",
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

describe("buildGraph", () => {
  it("groups legs by the stop they leave from", () => {
    const graph = buildGraph([
      makeSegment("s1", "A", "B"),
      makeSegment("s2", "A", "C"),
      makeSegment("s3", "B", "C"),
    ]);
    expect(legsFrom(graph, "A").map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(legsFrom(graph, "B").map((s) => s.id)).toEqual(["s3"]);
  });

  it("does not list a leg under the stop it arrives at", () => {
    const graph = buildGraph([makeSegment("s1", "A", "B")]);
    expect(legsFrom(graph, "B")).toEqual([]);
  });

  it("returns an empty list for a stop it has never heard of", () => {
    const graph = buildGraph([makeSegment("s1", "A", "B")]);
    expect(legsFrom(graph, "nowhere")).toEqual([]);
  });

  it("returns legs in the same order whatever order they arrive in", () => {
    const graph = buildGraph([
      makeSegment("b", "A", "C"),
      makeSegment("a", "A", "B"),
    ]);
    expect(legsFrom(graph, "A").map((s) => s.id)).toEqual(["a", "b"]);
  });
});

describe("buildGraph with the Isolo sample data", () => {
  const segments = SegmentSchema.array().parse(segmentsJson);
  const graph = buildGraph(segments);

  it("gives Ishaga two ways out: the bus to Oshodi and the keke to Mushin", () => {
    expect(legsFrom(graph, "stop_ishaga").map((s) => s.id)).toEqual([
      "seg_bus_ishaga_oshodi",
      "seg_keke_ishaga_mushin",
    ]);
  });

  it("gives the hospital no way out, because it is where both journeys end", () => {
    expect(legsFrom(graph, "stop_hospital")).toEqual([]);
  });
});
