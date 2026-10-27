import { describe, expect, it } from "vitest";
import {
  addSavedTrip,
  isSaved,
  MAX_SAVED,
  parseSavedTrips,
  removeSavedTrip,
  serializeSavedTrips,
  type SavedTrip,
} from "./saved-trips";
import { buildTripHref } from "./trip-query";

const origin = { lat: 6.533, lng: 3.329 };
const destination = { lat: 6.53, lng: 3.379 };

// A good saved trip. Pass only what a test cares about.
function makeTrip(overrides: Partial<SavedTrip> = {}): SavedTrip {
  return {
    href: buildTripHref(origin, destination, "seg_a>seg_b"),
    title: "Isolo to National Orthopaedic Hospital",
    via: "Via Mushin",
    fareMin: 600,
    fareMax: 900,
    estimate: true,
    savedAt: 1_700_000_000_000,
    ...overrides,
  };
}

const tripWithId = (id: string) =>
  makeTrip({ href: buildTripHref(origin, destination, id) });

describe("parseSavedTrips", () => {
  it("reads back what was saved", () => {
    const trips = [makeTrip(), tripWithId("seg_c")];
    expect(parseSavedTrips(serializeSavedTrips(trips))).toEqual(trips);
  });

  it("returns an empty list for nothing, damage, or the wrong kind of data", () => {
    for (const raw of [null, "", "not json {", "{}", "42", '"text"', "null"]) {
      expect(parseSavedTrips(raw)).toEqual([]);
    }
  });

  it("keeps the good entries and quietly drops the bad ones", () => {
    const good = makeTrip();
    const raw = JSON.stringify([
      { nonsense: true },
      good,
      "text",
      null,
      { ...good, fareMin: "600" },
    ]);
    expect(parseSavedTrips(raw)).toEqual([good]);
  });

  it("refuses addresses that are not exactly one of our own trip pages", () => {
    const bad = [
      "javascript:alert(1)",
      "https://evil.example/trip?olat=6.533",
      "//evil.example/trip?olat=6.533",
      "/other?olat=6.533",
      "/trip",
      `${makeTrip().href}&extra=1`,
      `${makeTrip().href}#section`,
      makeTrip().href.replace("olat=6.533", "olat=6.5330"),
      makeTrip().href.replace("%3E", ">"),
    ];
    for (const href of bad) {
      expect(parseSavedTrips(JSON.stringify([makeTrip({ href })]))).toEqual([]);
    }
  });

  it("refuses extra fields, wrong kinds of value, and fares the wrong way round", () => {
    const good = makeTrip();
    const broken = [
      { ...good, extra: 1 },
      { ...good, title: "" },
      { ...good, title: "x".repeat(201) },
      { ...good, estimate: "yes" },
      { ...good, fareMin: 900, fareMax: 600 },
      { ...good, fareMin: 1.5 },
      { ...good, savedAt: -1 },
    ];
    for (const entry of broken) {
      expect(parseSavedTrips(JSON.stringify([entry]))).toEqual([]);
    }
  });

  it("keeps only one of the same trip, and never more than the limit", () => {
    const first = makeTrip();
    expect(
      parseSavedTrips(JSON.stringify([first, { ...first, title: "Copy" }])),
    ).toEqual([first]);

    const many = Array.from({ length: MAX_SAVED + 5 }, (_, i) =>
      tripWithId(`seg_${i}`),
    );
    expect(parseSavedTrips(JSON.stringify(many))).toHaveLength(MAX_SAVED);
  });

  it("does not even try to read a list that is far too long to be ours", () => {
    expect(parseSavedTrips(`[${"0,".repeat(60_000)}0]`)).toEqual([]);
  });
});

describe("changing the saved list", () => {
  it("puts the newest trip first and moves a repeat to the top", () => {
    const a = tripWithId("seg_a");
    const b = tripWithId("seg_b");
    const c = tripWithId("seg_c");
    expect(addSavedTrip(addSavedTrip([a], b), c).map((t) => t.href)).toEqual([
      c.href,
      b.href,
      a.href,
    ]);
    expect(addSavedTrip([c, b, a], a).map((t) => t.href)).toEqual([
      a.href,
      c.href,
      b.href,
    ]);
  });

  it("drops the oldest trips beyond the limit, and leaves the original list alone", () => {
    const full = Array.from({ length: MAX_SAVED }, (_, i) =>
      tripWithId(`seg_${i}`),
    );
    const copy = [...full];
    const next = addSavedTrip(full, tripWithId("seg_new"));
    expect(next).toHaveLength(MAX_SAVED);
    expect(next[0].href).toBe(tripWithId("seg_new").href);
    expect(next.some((t) => t.href === full[MAX_SAVED - 1].href)).toBe(false);
    expect(full).toEqual(copy);
  });

  it("removes a trip and can tell whether one is saved", () => {
    const a = tripWithId("seg_a");
    const b = tripWithId("seg_b");
    expect(removeSavedTrip([a, b], a.href)).toEqual([b]);
    expect(removeSavedTrip([a, b], "/trip?nothing")).toEqual([a, b]);
    expect(isSaved([a, b], b.href)).toBe(true);
    expect(isSaved([a], b.href)).toBe(false);
  });
});
