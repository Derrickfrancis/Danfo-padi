import { describe, expect, it } from "vitest";
import stopsJson from "./fixtures/sample/stops.json";
import { StopSchema, type Stop } from "./domain";
import { searchPlaces } from "./places";

const sampleStops = StopSchema.array().parse(stopsJson);

// A small fake stop, so each test says only what it cares about.
function makeStop(
  id: string,
  name: string,
  overrides: Partial<Stop> = {},
): Stop {
  return {
    id,
    name,
    area: "Test",
    lat: 6.5,
    lng: 3.3,
    type: "bus_stop",
    ...overrides,
  };
}

// The ids of the suggestions for a query, in order.
function ids(
  query: string,
  list: readonly Stop[] = sampleStops,
  limit?: number,
): string[] {
  return searchPlaces(list, query, limit).map((match) => match.id);
}

describe("searchPlaces with the Isolo sample stops", () => {
  it("finds a stop by the start of its name", () => {
    expect(ids("ishaga")).toEqual(["stop_ishaga"]);
  });

  it("ignores capital letters, extra spaces and punctuation", () => {
    expect(ids("  ISHAGA!! ")).toEqual(["stop_ishaga"]);
  });

  it("finds a stop by any word in its name", () => {
    expect(ids("orthopaedic")).toEqual(["stop_hospital"]);
  });

  it("puts an exact name before longer names that start the same way", () => {
    expect(ids("oshodi")).toEqual(["stop_oshodi", "stop_oshodi_third_lane"]);
  });

  it("finds stops by the area they are in", () => {
    expect(ids("isolo")).toEqual(["stop_ishaga"]);
  });

  it("finds a stop when the words are typed in any order", () => {
    expect(ids("ishaga isolo")).toEqual(["stop_ishaga"]);
    expect(ids("isolo ishaga")).toEqual(["stop_ishaga"]);
  });
});

describe("searchPlaces rules", () => {
  it("puts the best matches first", () => {
    const list = [
      makeStop("e", "Amushina Park"), // contains it
      makeStop("d", "Bus Park", { area: "Mushin" }), // only the area matches
      makeStop("c", "Old Mushin Road"), // a later word starts with it
      makeStop("b", "Mushin Market"), // the name starts with it
      makeStop("a", "Mushin"), // exactly it
    ];
    expect(ids("mushin", list)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("treats accented and plain letters as the same, both ways", () => {
    expect(ids("ikeja", [makeStop("x", "Ìkẹjà Bus Stop")])).toEqual(["x"]);
    expect(ids("Ìkẹjà", [makeStop("y", "Ikeja")])).toEqual(["y"]);
  });

  it("also searches the name people use locally", () => {
    const list = [
      makeStop("u", "Mushin Bridge Stop", { local_alias: "Under Bridge" }),
    ];
    expect(ids("under bridge", list)).toEqual(["u"]);
  });

  it("suggests nothing for text that is empty, one letter, or only punctuation", () => {
    for (const query of ["", "a", "!!", "   ", " a "]) {
      expect(ids(query)).toEqual([]);
    }
  });

  it("respects the limit, and ignores silly limits", () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      makeStop(`s${String(i).padStart(2, "0")}`, `Stop ${i}`),
    );
    expect(ids("stop", many, 3)).toHaveLength(3);
    expect(ids("stop", many, 1000)).toHaveLength(10);
    expect(ids("stop", many, Number.NaN)).toHaveLength(8);
    expect(ids("stop", many, 0)).toHaveLength(1);
    expect(ids("stop", many, -5)).toHaveLength(1);
  });

  it("copes with an enormous query", () => {
    expect(ids("x".repeat(1_000_000))).toEqual([]);
  });

  it("returns only what a suggestion list needs", () => {
    const [first] = searchPlaces(sampleStops, "ishaga");
    expect(first).toEqual({
      id: "stop_ishaga",
      name: "Ishaga bus stop",
      area: "Isolo",
      lat: 6.533,
      lng: 3.329,
    });
  });

  it("returns nothing when nothing matches", () => {
    expect(ids("zzzz")).toEqual([]);
  });
});
