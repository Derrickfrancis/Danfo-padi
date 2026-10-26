import { describe, expect, it } from "vitest";
import { buildTripHref, parseTripQuery } from "./trip-query";

const places = { olat: "6.533", olng: "3.329", dlat: "6.53", dlng: "3.379" };
const tripId =
  "seg_keke_ishaga_mushin>seg_bus_mushin_onipan>seg_walk_onipan_hospital";

describe("parseTripQuery", () => {
  it("accepts a good address and returns the places and the trip id", () => {
    expect(parseTripQuery({ ...places, trip: tripId })).toEqual({
      ok: true,
      data: {
        origin: { lat: 6.533, lng: 3.329 },
        destination: { lat: 6.53, lng: 3.379 },
        tripId,
      },
    });
  });

  it("refuses a trip id that is missing, repeated or the wrong shape", () => {
    const odd: (string | string[] | undefined)[] = [
      undefined,
      "",
      ["seg_a", "seg_b"],
      "Seg_A",
      "seg a",
      "seg_a>",
      ">seg_a",
      "seg_a>>seg_b",
      "seg_a;drop",
      "../etc/passwd",
      `${"a".repeat(65)}`,
    ];
    for (const trip of odd) {
      expect(parseTripQuery({ ...places, trip })).toEqual({ ok: false });
    }
  });

  it("allows up to 8 legs and no more", () => {
    const legs = (count: number) =>
      Array.from({ length: count }, (_, i) => `seg_${i}`).join(">");
    expect(parseTripQuery({ ...places, trip: legs(8) }).ok).toBe(true);
    expect(parseTripQuery({ ...places, trip: legs(9) })).toEqual({ ok: false });
  });

  it("refuses a sort order, unknown names, and places that are wrong", () => {
    expect(
      parseTripQuery({ ...places, trip: tripId, sort: "cheapest" }),
    ).toEqual({ ok: false });
    expect(
      parseTripQuery({ ...places, trip: tripId, from: "Call 0800 now" }),
    ).toEqual({ ok: false });
    expect(parseTripQuery({ ...places, olat: "99", trip: tripId })).toEqual({
      ok: false,
    });
    expect(parseTripQuery({ trip: tripId })).toEqual({ ok: false });
  });
});

describe("buildTripHref", () => {
  it("builds an address that parseTripQuery reads back exactly", () => {
    const origin = { lat: 6.533, lng: 3.329 };
    const destination = { lat: 6.53, lng: 3.379 };
    const href = buildTripHref(origin, destination, tripId);

    expect(href.startsWith("/trip?")).toBe(true);
    expect(href).not.toContain(">"); // the ">" is written as %3E so the address stays safe
    const params = Object.fromEntries(
      new URL(href, "http://localhost").searchParams,
    );
    expect(parseTripQuery(params)).toEqual({
      ok: true,
      data: { origin, destination, tripId },
    });
  });
});
