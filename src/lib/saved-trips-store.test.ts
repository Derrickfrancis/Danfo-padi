import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseSavedTrips, type SavedTrip } from "./saved-trips";
import {
  readSavedRaw,
  saveTrip,
  subscribeToSaved,
  unsaveTrip,
} from "./saved-trips-store";
import { buildTripHref } from "./trip-query";

const trip: SavedTrip = {
  href: buildTripHref(
    { lat: 6.533, lng: 3.329 },
    { lat: 6.53, lng: 3.379 },
    "seg_a>seg_b",
  ),
  title: "Isolo to National Orthopaedic Hospital",
  via: "Via Mushin",
  fareMin: 600,
  fareMax: 900,
  estimate: true,
  savedAt: 1_700_000_000_000,
};

// A pretend phone storage that can also be told to refuse.
function makeStorage(
  options: { failReads?: boolean; failWrites?: boolean } = {},
) {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      if (options.failReads) throw new Error("storage unavailable");
      return data.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      if (options.failWrites) throw new Error("storage full");
      data.set(key, value);
    },
  };
}

beforeEach(() => {
  vi.stubGlobal("window", new EventTarget());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the saved trips store", () => {
  it("saves a trip, remembers it, and tells anyone listening", () => {
    vi.stubGlobal("localStorage", makeStorage());
    let notified = 0;
    subscribeToSaved(() => {
      notified += 1;
    });

    expect(saveTrip(trip)).toBe(true);
    expect(parseSavedTrips(readSavedRaw())).toEqual([trip]);
    expect(notified).toBe(1);
  });

  it("removes a saved trip and tells anyone listening", () => {
    vi.stubGlobal("localStorage", makeStorage());
    saveTrip(trip);
    let notified = 0;
    subscribeToSaved(() => {
      notified += 1;
    });

    expect(unsaveTrip(trip.href)).toBe(true);
    expect(parseSavedTrips(readSavedRaw())).toEqual([]);
    expect(notified).toBe(1);
  });

  it("says so, and tells nobody, when the phone will not let us save", () => {
    vi.stubGlobal("localStorage", makeStorage({ failWrites: true }));
    let notified = 0;
    subscribeToSaved(() => {
      notified += 1;
    });

    expect(saveTrip(trip)).toBe(false);
    expect(notified).toBe(0);
  });

  it("copes with storage that cannot be read at all", () => {
    vi.stubGlobal("localStorage", makeStorage({ failReads: true }));
    expect(readSavedRaw()).toBe("");
  });

  it("stops telling a listener once it has unsubscribed", () => {
    vi.stubGlobal("localStorage", makeStorage());
    let notified = 0;
    const stop = subscribeToSaved(() => {
      notified += 1;
    });

    stop();
    saveTrip(trip);
    expect(notified).toBe(0);
  });
});
