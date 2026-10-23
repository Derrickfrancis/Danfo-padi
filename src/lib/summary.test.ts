import { describe, expect, it } from "vitest";
import segmentsJson from "../data/segments.json";
import { SegmentSchema, type Segment } from "./domain";
import { buildGraph } from "./graph";
import { findJourneys } from "./journeys";
import { summarizeJourney } from "./summary";

// A fake leg. Pass only the fields a test cares about; the rest get plain defaults.
function makeSegment(overrides: Partial<Segment> = {}): Segment {
  return {
    id: "x",
    route_id: "r1",
    from_stop_id: "A",
    to_stop_id: "B",
    mode: "bus",
    description: "x",
    time_min: 5,
    time_max: 10,
    fare_type: "range",
    fare_min: 100,
    fare_max: 200,
    source: "sample",
    confidence: "sample",
    ...overrides,
  };
}

describe("summarizeJourney with the Isolo sample data", () => {
  const graph = buildGraph(SegmentSchema.array().parse(segmentsJson));
  const [viaOshodi, viaMushin] = findJourneys(
    graph,
    "stop_ishaga",
    "stop_hospital",
  );

  it("totals Via Mushin to the prototype's fare of 600 to 900 naira", () => {
    expect(summarizeJourney(viaMushin)).toEqual({
      journeyId: viaMushin.id,
      timeMin: 51, // 15 + 25 + 5 minutes of travel, plus 3 + 3 minutes waiting
      timeMax: 95, // 25 + 40 + 10 minutes of travel, plus 10 + 10 minutes waiting
      fareMin: 600,
      fareMax: 900,
      rides: 2,
      walks: 1,
      transfers: 1,
      confidence: "sample",
    });
  });

  it("totals Via Oshodi to the prototype's fare of 900 to 1,200 naira", () => {
    expect(summarizeJourney(viaOshodi)).toEqual({
      journeyId: viaOshodi.id,
      timeMin: 49,
      timeMax: 85,
      fareMin: 900,
      fareMax: 1200,
      rides: 2,
      walks: 1,
      transfers: 1,
      confidence: "sample",
    });
  });
});

describe("summarizeJourney rules", () => {
  it("counts no transfer for a single ride", () => {
    const summary = summarizeJourney({ id: "j", legs: [makeSegment()] });
    expect(summary.rides).toBe(1);
    expect(summary.transfers).toBe(0);
  });

  it("adds no waiting time and no fare to a walk", () => {
    const walk = makeSegment({
      mode: "walk",
      fare_type: "fixed",
      fare_min: 0,
      fare_max: 0,
      time_min: 4,
      time_max: 6,
    });
    expect(summarizeJourney({ id: "w", legs: [walk] })).toEqual({
      journeyId: "w",
      timeMin: 4,
      timeMax: 6,
      fareMin: 0,
      fareMax: 0,
      rides: 0,
      walks: 1,
      transfers: 0,
      confidence: "sample",
    });
  });

  it("trusts a journey only as much as its weakest leg", () => {
    const mixed = [
      makeSegment({ confidence: "high" }),
      makeSegment({ confidence: "low" }),
      makeSegment({ confidence: "medium" }),
    ];
    expect(summarizeJourney({ id: "mixed", legs: mixed }).confidence).toBe(
      "low",
    );

    const solid = [
      makeSegment({ confidence: "high" }),
      makeSegment({ confidence: "high" }),
    ];
    expect(summarizeJourney({ id: "solid", legs: solid }).confidence).toBe(
      "high",
    );
  });

  it("gives zeros, and the lowest trust, for a journey with no legs", () => {
    expect(summarizeJourney({ id: "empty", legs: [] })).toEqual({
      journeyId: "empty",
      timeMin: 0,
      timeMax: 0,
      fareMin: 0,
      fareMax: 0,
      rides: 0,
      walks: 0,
      transfers: 0,
      confidence: "sample",
    });
  });
});
