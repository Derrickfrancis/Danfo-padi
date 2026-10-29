import { describe, expect, it } from "vitest";
import type { PlaceMatch } from "./places";
import {
  addRecentPlace,
  MAX_RECENT,
  parseRecentPlaces,
  serializeRecentPlaces,
} from "./recent-places";

function makePlace(overrides: Partial<PlaceMatch> = {}): PlaceMatch {
  return {
    id: "stop_ishaga",
    name: "Ishaga bus stop",
    area: "Isolo",
    lat: 6.533,
    lng: 3.329,
    ...overrides,
  };
}

const placeWithId = (id: string) => makePlace({ id, name: `Stop ${id}` });

describe("parseRecentPlaces", () => {
  it("reads back what was saved", () => {
    const places = [makePlace(), placeWithId("stop_b")];
    expect(parseRecentPlaces(serializeRecentPlaces(places))).toEqual(places);
  });

  it("returns an empty list for nothing, damage, or the wrong kind of data", () => {
    for (const raw of [null, "", "not json {", "{}", "42", '"text"', "null"]) {
      expect(parseRecentPlaces(raw)).toEqual([]);
    }
  });

  it("keeps the good entries and quietly drops the bad ones", () => {
    const good = makePlace();
    const raw = JSON.stringify([
      { nonsense: true },
      good,
      "text",
      null,
      { ...good, lat: "6.5" },
    ]);
    expect(parseRecentPlaces(raw)).toEqual([good]);
  });

  it("refuses extra fields, wrong kinds of value, and places outside Lagos", () => {
    const good = makePlace();
    const broken = [
      { ...good, extra: 1 },
      { ...good, id: "" },
      { ...good, name: "x".repeat(121) },
      { ...good, area: "x".repeat(81) },
      { ...good, lat: 51.5 },
      { ...good, lng: 9.9 },
      { ...good, lat: Number.NaN },
    ];
    for (const entry of broken) {
      expect(parseRecentPlaces(JSON.stringify([entry]))).toEqual([]);
    }
  });

  it("keeps only one of the same place, and never more than the limit", () => {
    const first = makePlace();
    expect(
      parseRecentPlaces(JSON.stringify([first, { ...first, name: "Copy" }])),
    ).toEqual([first]);

    const many = Array.from({ length: MAX_RECENT + 5 }, (_, i) =>
      placeWithId(`stop_${i}`),
    );
    expect(parseRecentPlaces(JSON.stringify(many))).toHaveLength(MAX_RECENT);
  });

  it("does not even try to read a list that is far too long to be ours", () => {
    expect(parseRecentPlaces(`[${"0,".repeat(11_000)}0]`)).toEqual([]);
  });
});

describe("addRecentPlace", () => {
  it("puts the newest place first and moves a repeat to the top", () => {
    const a = placeWithId("a");
    const b = placeWithId("b");
    const c = placeWithId("c");
    expect(addRecentPlace(addRecentPlace([a], b), c).map((p) => p.id)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(addRecentPlace([c, b, a], a).map((p) => p.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });

  it("drops the oldest places beyond the limit, and leaves the original list alone", () => {
    const full = Array.from({ length: MAX_RECENT }, (_, i) =>
      placeWithId(`stop_${i}`),
    );
    const copy = [...full];
    const next = addRecentPlace(full, placeWithId("stop_new"));
    expect(next).toHaveLength(MAX_RECENT);
    expect(next[0].id).toBe("stop_new");
    expect(next.some((p) => p.id === full[MAX_RECENT - 1].id)).toBe(false);
    expect(full).toEqual(copy);
  });
});
