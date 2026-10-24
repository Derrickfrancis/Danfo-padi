import { describe, expect, it } from "vitest";
import { fetchPlaces } from "./places-client";

const ishaga = {
  id: "stop_ishaga",
  name: "Ishaga bus stop",
  area: "Isolo",
  lat: 6.533,
  lng: 3.329,
};

// A pretend server that always answers with this body and status.
function reply(body: unknown, status = 200) {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("fetchPlaces", () => {
  it("puts the typed text safely into the address", async () => {
    let address = "";
    const result = await fetchPlaces("ish aga & co", {
      fetchImpl: async (url: string) => {
        address = url;
        return new Response(JSON.stringify({ places: [] }));
      },
    });
    expect(address).toBe("/api/places?q=ish%20aga%20%26%20co");
    expect(result).toEqual({ ok: true, places: [] });
  });

  it("returns the suggestions from a good answer", async () => {
    const result = await fetchPlaces("ish", {
      fetchImpl: reply({ places: [ishaga] }),
    });
    expect(result).toEqual({ ok: true, places: [ishaga] });
  });

  it("turns each kind of server answer into a clear reason", async () => {
    const cases = [
      [429, "rate_limited"],
      [400, "bad_request"],
      [500, "server_error"],
      [503, "server_error"],
    ] as const;
    for (const [status, reason] of cases) {
      const result = await fetchPlaces("ish", {
        fetchImpl: reply({ error: "x" }, status),
      });
      expect(result).toEqual({ ok: false, reason });
    }
  });

  it("reports a lost connection", async () => {
    const result = await fetchPlaces("ish", {
      fetchImpl: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    expect(result).toEqual({ ok: false, reason: "network" });
  });

  it("reports a cancelled request separately from a failed one", async () => {
    const result = await fetchPlaces("ish", {
      fetchImpl: async () => {
        throw new DOMException("aborted", "AbortError");
      },
    });
    expect(result).toEqual({ ok: false, reason: "aborted" });
  });

  it("refuses an answer that is not JSON", async () => {
    const result = await fetchPlaces("ish", {
      fetchImpl: async () => new Response("<html>oops</html>", { status: 200 }),
    });
    expect(result).toEqual({ ok: false, reason: "bad_response" });
  });

  it("refuses an answer with the wrong shape", async () => {
    const wrongShapes = [
      {},
      null,
      [],
      { places: "x" },
      { places: [{ ...ishaga, lat: "6.5" }] }, // a number sent as text
      { places: [{ ...ishaga, extra: 1 }] }, // a field we did not expect
      { places: [ishaga], extra: 1 },
      { places: Array.from({ length: 11 }, () => ishaga) }, // more than we ever send
    ];
    for (const body of wrongShapes) {
      const result = await fetchPlaces("ish", { fetchImpl: reply(body) });
      expect(result).toEqual({ ok: false, reason: "bad_response" });
    }
  });

  it("does not even ask when the text is too long", async () => {
    let asked = false;
    const result = await fetchPlaces("a".repeat(61), {
      fetchImpl: async () => {
        asked = true;
        return new Response("{}");
      },
    });
    expect(result).toEqual({ ok: false, reason: "bad_request" });
    expect(asked).toBe(false);
  });
});
