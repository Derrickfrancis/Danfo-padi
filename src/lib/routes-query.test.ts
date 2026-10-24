import { describe, expect, it } from "vitest";
import { parseRoutesQuery } from "./routes-query";

const good = { olat: "6.533", olng: "3.329", dlat: "6.53", dlng: "3.379" };

describe("parseRoutesQuery", () => {
  it("accepts a complete address and defaults to the best-first order", () => {
    expect(parseRoutesQuery(good)).toEqual({
      ok: true,
      data: {
        origin: { lat: 6.533, lng: 3.329 },
        destination: { lat: 6.53, lng: 3.379 },
        sort: "best",
      },
    });
  });

  it("accepts each sort order and refuses any other", () => {
    for (const sort of ["best", "cheapest", "fastest"]) {
      const result = parseRoutesQuery({ ...good, sort });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.data.sort).toBe(sort);
    }
    expect(parseRoutesQuery({ ...good, sort: "price" })).toEqual({ ok: false });
    expect(parseRoutesQuery({ ...good, sort: "" })).toEqual({ ok: false });
  });

  it("refuses an address with a missing coordinate", () => {
    expect(parseRoutesQuery({})).toEqual({ ok: false });
    for (const name of ["olat", "olng", "dlat", "dlng"]) {
      const incomplete: Record<string, string> = { ...good };
      delete incomplete[name];
      expect(parseRoutesQuery(incomplete)).toEqual({ ok: false });
    }
  });

  it("refuses places outside Lagos", () => {
    expect(parseRoutesQuery({ ...good, olat: "51.5" })).toEqual({ ok: false });
    expect(parseRoutesQuery({ ...good, dlng: "9.9" })).toEqual({ ok: false });
  });

  it("refuses numbers that are not plain decimals", () => {
    const odd = [
      "1e1",
      "6.5abc",
      "0x10",
      " 6.5",
      "6.5 ",
      "6.1234567",
      "--6",
      ".5",
      "6.",
      "",
      "NaN",
      "Infinity",
      "6,5",
      "+6.5",
    ];
    for (const value of odd) {
      expect(parseRoutesQuery({ ...good, olat: value })).toEqual({ ok: false });
    }
  });

  it("refuses names we did not ask for, repeated values, and says nothing about why", () => {
    expect(parseRoutesQuery({ ...good, from: "Call 0800 now" })).toEqual({
      ok: false,
    });
    expect(parseRoutesQuery({ ...good, extra: "1" })).toEqual({ ok: false });
    expect(parseRoutesQuery({ ...good, olat: ["6.5", "6.6"] })).toEqual({
      ok: false,
    });
    expect(parseRoutesQuery({ ...good, sort: undefined })).toEqual({
      ok: false,
    });
  });
});
