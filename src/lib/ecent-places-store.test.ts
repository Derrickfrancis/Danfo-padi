import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaceMatch } from "./places";
import { parseRecentPlaces } from "./recent-places";
import {
  readRecentRaw,
  rememberPlaces,
  subscribeToRecent,
} from "./recent-places-store";

const ishaga: PlaceMatch = {
  id: "stop_ishaga",
  name: "Ishaga bus stop",
  area: "Isolo",
  lat: 6.533,
  lng: 3.329,
};
const hospital: PlaceMatch = {
  id: "stop_hospital",
  name: "National Orthopaedic Hospital",
  area: "Igbobi",
  lat: 6.53,
  lng: 3.379,
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

describe("the recent places store", () => {
  it("remembers places so that the last one given is the newest, and tells anyone listening", () => {
    vi.stubGlobal("localStorage", makeStorage());
    let notified = 0;
    subscribeToRecent(() => {
      notified += 1;
    });

    expect(rememberPlaces([ishaga, hospital])).toBe(true);
    expect(parseRecentPlaces(readRecentRaw()).map((place) => place.id)).toEqual(
      ["stop_hospital", "stop_ishaga"],
    );
    expect(notified).toBe(1);
  });

  it("does nothing, and tells nobody, when there is nothing to remember", () => {
    vi.stubGlobal("localStorage", makeStorage());
    let notified = 0;
    subscribeToRecent(() => {
      notified += 1;
    });

    expect(rememberPlaces([])).toBe(true);
    expect(notified).toBe(0);
  });

  it("says so, and tells nobody, when the phone will not let us save", () => {
    vi.stubGlobal("localStorage", makeStorage({ failWrites: true }));
    let notified = 0;
    subscribeToRecent(() => {
      notified += 1;
    });

    expect(rememberPlaces([ishaga])).toBe(false);
    expect(notified).toBe(0);
  });

  it("copes with storage that cannot be read at all", () => {
    vi.stubGlobal("localStorage", makeStorage({ failReads: true }));
    expect(readRecentRaw()).toBe("");
  });
});
