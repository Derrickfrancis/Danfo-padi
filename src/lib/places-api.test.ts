import { describe, expect, it } from "vitest";
import { MAX_PLACES_QUERY_CHARS, parsePlacesQuery } from "./places-api";

describe("parsePlacesQuery", () => {
  it("accepts a single q, including encoded spaces", () => {
    expect(parsePlacesQuery(new URLSearchParams("q=ishaga"))).toEqual({
      ok: true,
      q: "ishaga",
    });
    expect(parsePlacesQuery(new URLSearchParams("q=ish%20aga"))).toEqual({
      ok: true,
      q: "ish aga",
    });
  });

  it("accepts an empty q, which simply has no suggestions", () => {
    expect(parsePlacesQuery(new URLSearchParams("q="))).toEqual({
      ok: true,
      q: "",
    });
  });

  it("refuses a request with no q", () => {
    expect(parsePlacesQuery(new URLSearchParams(""))).toEqual({
      ok: false,
      error: "invalid_request",
      fields: ["q"],
    });
  });

  it("refuses extra or repeated parameters, without repeating their names", () => {
    const expected = {
      ok: false,
      error: "invalid_request",
      fields: ["(request)"],
    };
    expect(parsePlacesQuery(new URLSearchParams("x=1"))).toEqual(expected);
    expect(parsePlacesQuery(new URLSearchParams("q=a&q=b"))).toEqual(expected);

    const extra = parsePlacesQuery(new URLSearchParams("q=ish&secretname=1"));
    expect(extra).toEqual(expected);
    expect(JSON.stringify(extra)).not.toContain("secretname");
  });

  it("allows exactly the longest query and refuses one character more", () => {
    const longest = "a".repeat(MAX_PLACES_QUERY_CHARS);
    expect(parsePlacesQuery(new URLSearchParams(`q=${longest}`)).ok).toBe(true);
    expect(parsePlacesQuery(new URLSearchParams(`q=${longest}a`))).toEqual({
      ok: false,
      error: "invalid_request",
      fields: ["q"],
    });
  });
});
