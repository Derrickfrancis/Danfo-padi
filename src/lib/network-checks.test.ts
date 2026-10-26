import { describe, expect, it } from "vitest";
import { checkNetwork } from "./network-checks";

type Table = Record<string, unknown>[];
type RawNetwork = {
  stops: Table;
  routes: Table;
  route_stops: Table;
  segments: Table;
};

// A tiny, correct network. Each test breaks one thing in a fresh copy.
function validNetwork(): RawNetwork {
  return {
    stops: [
      {
        id: "s1",
        name: "First",
        area: "Isolo",
        lat: 6.53,
        lng: 3.33,
        type: "bus_stop",
      },
      {
        id: "s2",
        name: "Second",
        area: "Isolo",
        lat: 6.54,
        lng: 3.34,
        type: "bus_stop",
      },
      {
        id: "s3",
        name: "Third",
        area: "Isolo",
        lat: 6.55,
        lng: 3.35,
        type: "bus_stop",
      },
    ],
    routes: [{ id: "r1", name: "First to Second", mode: "bus" }],
    route_stops: [
      { route_id: "r1", stop_id: "s1", sequence: 0 },
      { route_id: "r1", stop_id: "s2", sequence: 1 },
    ],
    segments: [
      {
        id: "ride1",
        route_id: "r1",
        from_stop_id: "s1",
        to_stop_id: "s2",
        mode: "bus",
        description: "First to Second",
        time_min: 10,
        time_max: 20,
        fare_type: "range",
        fare_min: 200,
        fare_max: 300,
        source: "survey",
        confidence: "low",
        verified_at: "2026-10-01",
      },
      {
        id: "walk1",
        from_stop_id: "s2",
        to_stop_id: "s3",
        mode: "walk",
        description: "Walk to Third",
        time_min: 5,
        time_max: 8,
        fare_type: "fixed",
        fare_min: 0,
        fare_max: 0,
        source: "survey",
        confidence: "low",
        verified_at: "2026-10-01",
      },
    ],
  };
}

const TODAY = "2026-10-25";

// Breaks a fresh copy of the network, checks it, and returns every problem as one block of text.
function problemsAfter(
  change: (network: RawNetwork) => void,
  options: { today?: string } = { today: TODAY },
): string {
  const network = validNetwork();
  change(network);
  return checkNetwork(network, options).problems.join("\n");
}

describe("checkNetwork", () => {
  it("accepts a complete, correct network", () => {
    expect(checkNetwork(validNetwork(), { today: TODAY }).problems).toEqual([]);
    expect(checkNetwork(validNetwork()).network).toBeTruthy();
  });

  it("says which table, which position and which id when a value is wrong", () => {
    const result = checkNetwork(
      (() => {
        const network = validNetwork();
        network.segments[0].fare_max = 999999;
        return network;
      })(),
    );
    expect(result.network).toBeNull();
    expect(result.problems[0]).toContain("segments[0]");
    expect(result.problems[0]).toContain("(id: ride1)");
    expect(result.problems[0]).toContain("fare_max");
  });

  it("refuses data that is not even the right kind of thing", () => {
    for (const nonsense of [null, undefined, 42, "text", [], {}]) {
      const result = checkNetwork(nonsense);
      expect(result.network).toBeNull();
      expect(result.problems.length).toBeGreaterThan(0);
    }
  });

  it("spots ids used twice", () => {
    const problems = problemsAfter((n) => {
      n.stops.push({ ...n.stops[0] });
      n.routes.push({ ...n.routes[0] });
      n.segments.push({ ...n.segments[0] });
    });
    expect(problems).toContain("Duplicate stop id: s1");
    expect(problems).toContain("Duplicate route id: r1");
    expect(problems).toContain("Duplicate segment id: ride1");
  });

  it("spots route stops that point at nothing", () => {
    const problems = problemsAfter((n) => {
      n.route_stops.push({ route_id: "r9", stop_id: "s1", sequence: 5 });
      n.route_stops.push({ route_id: "r1", stop_id: "s9", sequence: 6 });
    });
    expect(problems).toContain("route_stops uses unknown route: r9");
    expect(problems).toContain("route_stops uses unknown stop: s9");
  });

  it("spots a stop twice on a route, and two stops in the same position", () => {
    expect(
      problemsAfter((n) =>
        n.route_stops.push({ route_id: "r1", stop_id: "s1", sequence: 5 }),
      ),
    ).toContain("Stop s1 appears twice on route r1");
    expect(
      problemsAfter((n) =>
        n.route_stops.push({ route_id: "r1", stop_id: "s3", sequence: 1 }),
      ),
    ).toContain("Route r1 has two stops at position 1");
  });

  it("spots a route with fewer than two stops", () => {
    expect(problemsAfter((n) => n.route_stops.pop())).toContain(
      "Route r1 needs at least two stops",
    );
  });

  it("spots legs that use an unknown stop or start and end in the same place", () => {
    expect(problemsAfter((n) => (n.segments[0].to_stop_id = "s9"))).toContain(
      "ride1: unknown to_stop_id s9",
    );
    expect(problemsAfter((n) => (n.segments[0].from_stop_id = "s9"))).toContain(
      "ride1: unknown from_stop_id s9",
    );
    expect(problemsAfter((n) => (n.segments[1].to_stop_id = "s2"))).toContain(
      "walk1: starts and ends at the same stop",
    );
  });

  it("spots a walking leg that has a fare", () => {
    const problems = problemsAfter((n) => {
      n.segments[1].fare_min = 50;
      n.segments[1].fare_max = 50;
    });
    expect(problems).toContain("walk1: a walking leg cannot have a fare");
  });

  it("spots rides that do not fit their route", () => {
    expect(problemsAfter((n) => delete n.segments[0].route_id)).toContain(
      "ride1: a ride must have a route_id",
    );
    expect(problemsAfter((n) => (n.segments[0].route_id = "r9"))).toContain(
      "ride1: unknown route r9",
    );
    expect(problemsAfter((n) => (n.segments[0].mode = "keke"))).toContain(
      "ride1: mode keke does not match route mode bus",
    );
    expect(problemsAfter((n) => (n.segments[0].to_stop_id = "s3"))).toContain(
      "ride1: both stops must be on route r1",
    );
    expect(
      problemsAfter((n) => {
        n.segments[0].from_stop_id = "s2";
        n.segments[0].to_stop_id = "s1";
      }),
    ).toContain("ride1: goes backwards along route r1");
    expect(
      problemsAfter((n) => {
        n.segments[0].fare_type = "fixed";
        n.segments[0].fare_min = 0;
        n.segments[0].fare_max = 0;
      }),
    ).toContain("ride1: a ride must cost something");
  });

  it("makes sure source and confidence agree about being sample data", () => {
    const message =
      'ride1: source and confidence must both be "sample", or neither';
    expect(problemsAfter((n) => (n.segments[0].source = "sample"))).toContain(
      message,
    );
    expect(
      problemsAfter((n) => (n.segments[0].confidence = "sample")),
    ).toContain(message);
    // Fully sample data needs no date.
    const allSample = problemsAfter((n) => {
      for (const segment of n.segments) {
        segment.source = "sample";
        segment.confidence = "sample";
        delete segment.verified_at;
      }
    });
    expect(allSample).toBe("");
  });

  it("asks for a checked date on anything that is not sample data, and refuses dates in the future", () => {
    expect(problemsAfter((n) => delete n.segments[0].verified_at)).toContain(
      "ride1: needs verified_at",
    );
    expect(
      problemsAfter((n) => (n.segments[0].verified_at = "2026-12-01")),
    ).toContain("ride1: verified_at is in the future");
    // Without a "today" we cannot judge, so we do not complain.
    expect(
      problemsAfter((n) => (n.segments[0].verified_at = "2026-12-01"), {}),
    ).not.toContain("in the future");
  });

  it("reports every problem it finds, not just the first", () => {
    const problems = problemsAfter((n) => {
      n.segments[0].to_stop_id = "s9";
      n.segments[1].fare_min = 50;
      n.segments[1].fare_max = 50;
    });
    expect(problems).toContain("unknown to_stop_id s9");
    expect(problems).toContain("a walking leg cannot have a fare");
  });
});
