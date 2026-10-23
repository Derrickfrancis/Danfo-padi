import { describe, expect, it } from "vitest";
import segmentsJson from "../data/segments.json";
import { SegmentSchema, type Segment } from "./domain";
import { buildGraph } from "./graph";
import { findJourneys, type Journey } from "./journeys";
import { rankJourneys, SCORE_WEIGHTS, sortJourneys } from "./ranking";

// A fake journey made of `rides` bus legs. Each leg takes `minutes` and costs `naira`.
// Each ride also adds 3 to 10 minutes of waiting, so the average time is rides x (minutes + 6.5).
function makeJourney(
  id: string,
  rides: number,
  minutes: number,
  naira: number,
): Journey {
  const legs: Segment[] = Array.from({ length: rides }, (_, i) => ({
    id: `${id}-${i}`,
    route_id: "r1",
    from_stop_id: "A",
    to_stop_id: "B",
    mode: "bus",
    description: id,
    time_min: minutes,
    time_max: minutes,
    fare_type: "fixed",
    fare_min: naira,
    fare_max: naira,
    source: "sample",
    confidence: "sample",
  }));
  return { id, legs };
}

describe("rankJourneys with the Isolo sample data", () => {
  const graph = buildGraph(SegmentSchema.array().parse(segmentsJson));
  const ranked = rankJourneys(
    findJourneys(graph, "stop_ishaga", "stop_hospital"),
  );
  const [viaMushin, viaOshodi] = ranked;

  it("ties on score, then puts the cheaper journey first, as the prototype does", () => {
    expect(viaMushin.journey.id.startsWith("seg_keke_ishaga_mushin")).toBe(
      true,
    );
    expect(viaOshodi.journey.id.startsWith("seg_bus_ishaga_oshodi")).toBe(true);
    expect(viaMushin.score).toBe(0.4);
    expect(viaOshodi.score).toBe(0.4);
  });

  it("badges Via Mushin as cheapest and Via Oshodi as fastest, with a reason for each", () => {
    expect(viaMushin.isBest).toBe(true);
    expect(viaMushin.badges).toEqual(["cheapest"]);
    expect(viaMushin.reason).toBe("Cheapest, with one transfer");

    expect(viaOshodi.isBest).toBe(false);
    expect(viaOshodi.badges).toEqual(["fastest"]);
    expect(viaOshodi.reason).toBe("Fastest, with one transfer");
  });

  it("gives each tab its own order without changing the original list", () => {
    const originalOrder = ranked.map((r) => r.journey.id);
    expect(sortJourneys(ranked, "cheapest")[0].journey.id).toBe(
      viaMushin.journey.id,
    );
    expect(sortJourneys(ranked, "fastest")[0].journey.id).toBe(
      viaOshodi.journey.id,
    );
    expect(sortJourneys(ranked, "best").map((r) => r.journey.id)).toEqual(
      originalOrder,
    );
    expect(ranked.map((r) => r.journey.id)).toEqual(originalOrder);
  });
});

describe("rankJourneys rules", () => {
  it("gives no badges when there is only one journey", () => {
    const [only] = rankJourneys([makeJourney("only", 1, 10, 100)]);
    expect(only.badges).toEqual([]);
    expect(only.isBest).toBe(true);
    expect(only.score).toBe(0);
    expect(only.reason).toBe("Only route found, with no transfer");
  });

  it("gives both badges to a journey that is cheapest and fastest", () => {
    const ranked = rankJourneys([
      makeJourney("slow-dear", 1, 30, 300),
      makeJourney("fast-cheap", 1, 10, 100),
    ]);
    expect(ranked.map((r) => r.journey.id)).toEqual([
      "fast-cheap",
      "slow-dear",
    ]);
    expect(ranked[0].badges).toEqual(["cheapest", "fastest"]);
    expect(ranked[0].reason).toBe("Cheapest and fastest, with no transfer");
    expect(ranked[1].badges).toEqual([]);
    expect(ranked[1].reason).toBe(
      "A balance of cost and time, with no transfer",
    );
  });

  it("points out a runner-up that needs fewer transfers than the best match", () => {
    const ranked = rankJourneys([
      makeJourney("direct", 1, 40, 200),
      makeJourney("best", 2, 5, 50),
    ]);
    expect(ranked[0].journey.id).toBe("best");
    expect(ranked[0].score).toBe(0.2);
    expect(ranked[1].score).toBe(0.8);
    expect(ranked[1].reason).toBe(
      "Fewer transfers than the best match (no transfer)",
    );
  });

  it("breaks a complete tie by id, with no badges", () => {
    const ranked = rankJourneys([
      makeJourney("b", 1, 10, 100),
      makeJourney("a", 1, 10, 100),
    ]);
    expect(ranked.map((r) => r.journey.id)).toEqual(["a", "b"]);
    expect(ranked[0].badges).toEqual([]);
    expect(ranked[1].badges).toEqual([]);
  });

  it("returns an empty list when there are no journeys", () => {
    expect(rankJourneys([])).toEqual([]);
  });

  it("uses weights that add up to one", () => {
    expect(
      SCORE_WEIGHTS.time + SCORE_WEIGHTS.cost + SCORE_WEIGHTS.transfers,
    ).toBeCloseTo(1, 10);
  });
});
