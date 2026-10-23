import { describe, expect, it } from "vitest";
import routesJson from "../data/routes.json";
import routeStopsJson from "../data/route-stops.json";
import segmentsJson from "../data/segments.json";
import stopsJson from "../data/stops.json";
import { MAX_BODY_CHARS, parseSearchRequest, toTripDto } from "./api";
import { NetworkSchema } from "./domain";
import { searchTrips } from "./search";

const valid = {
  origin: { lat: 6.533, lng: 3.329 },
  destination: { lat: 6.53, lng: 3.379 },
};

function body(value: unknown): string {
  return JSON.stringify(value);
}

describe("parseSearchRequest", () => {
  it("accepts a good request", () => {
    expect(parseSearchRequest(body(valid))).toEqual({ ok: true, data: valid });
  });

  it("refuses text that is not JSON", () => {
    expect(parseSearchRequest("not json {")).toEqual({
      ok: false,
      error: "invalid_json",
      fields: [],
    });
  });

  it("refuses a body that is far too big, before even reading it", () => {
    const huge = "x".repeat(MAX_BODY_CHARS + 1);
    expect(parseSearchRequest(huge)).toEqual({
      ok: false,
      error: "too_large",
      fields: [],
    });
  });

  it("refuses places outside Lagos", () => {
    const result = parseSearchRequest(
      body({ ...valid, origin: { lat: 51.5, lng: 3.3 } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("invalid_request");
      expect(result.fields).toContain("origin.lat");
    }
  });

  it("refuses fields we did not ask for, at the top and inside a place", () => {
    const top = parseSearchRequest(body({ ...valid, maxWalkMeters: 99999 }));
    expect(top.ok).toBe(false);

    const nested = parseSearchRequest(
      body({ ...valid, origin: { ...valid.origin, altitude: 5 } }),
    );
    expect(nested.ok).toBe(false);
    if (!nested.ok) expect(nested.fields).toContain("origin");
  });

  it("refuses a missing place and numbers sent as text", () => {
    const missing = parseSearchRequest(body({ origin: valid.origin }));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.fields).toContain("destination");

    const text = parseSearchRequest(
      body({ ...valid, origin: { lat: "6.5", lng: 3.3 } }),
    );
    expect(text.ok).toBe(false);
    if (!text.ok) expect(text.fields).toContain("origin.lat");
  });

  it("refuses valid JSON that is not an object", () => {
    for (const text of ["null", "[]", "42", '"hello"']) {
      const result = parseSearchRequest(text);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe("invalid_request");
    }
  });

  it("never repeats back what was sent", () => {
    const result = parseSearchRequest(
      body({ ...valid, origin: { lat: 51.5, lng: 3.3 } }),
    );
    expect(JSON.stringify(result)).not.toContain("51.5");
  });
});

describe("toTripDto", () => {
  const network = NetworkSchema.parse({
    stops: stopsJson,
    routes: routesJson,
    route_stops: routeStopsJson,
    segments: segmentsJson,
  });
  const trips = searchTrips(network, valid.origin, valid.destination, {
    maxWalkMeters: 300,
  });
  const dto = toTripDto(trips[0]);

  it("turns the best journey into exactly what a route card needs", () => {
    expect(dto).toMatchObject({
      isBest: true,
      badges: ["cheapest"],
      reason: "Cheapest, with one transfer",
      timeMin: 51,
      timeMax: 95,
      fareMin: 600,
      fareMax: 900,
      rides: 2,
      walks: 1,
      transfers: 1,
      confidence: "sample",
      access: {
        stopId: "stop_ishaga",
        name: "Ishaga bus stop",
        meters: 0,
        walkMinutes: 0,
      },
      egress: {
        stopId: "stop_hospital",
        name: "National Orthopaedic Hospital",
        meters: 0,
        walkMinutes: 0,
      },
    });
    expect(dto.legs.map((leg) => leg.id)).toEqual([
      "seg_keke_ishaga_mushin",
      "seg_bus_mushin_onipan",
      "seg_walk_onipan_hospital",
    ]);
    expect(dto.legs[0]).toEqual({
      id: "seg_keke_ishaga_mushin",
      mode: "keke",
      description: "Ishaga to Mushin (keke or korope)",
      fromStopId: "stop_ishaga",
      toStopId: "stop_mushin",
      timeMin: 15,
      timeMax: 25,
      fareMin: 300,
      fareMax: 500,
      fareType: "range",
      source: "sample",
      confidence: "sample",
    });
  });

  it("contains only plain data that survives being sent as JSON", () => {
    expect(JSON.parse(JSON.stringify(dto))).toEqual(dto);
  });
});
