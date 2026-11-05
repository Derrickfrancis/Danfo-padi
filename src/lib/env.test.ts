import { describe, expect, it } from "vitest";
import { readPublicEnv } from "./env";

// An obviously fake key that has the shape of a real one.
const fakeKey = `AIza${"x".repeat(35)}`;

describe("readPublicEnv", () => {
  it("accepts a key that looks right", () => {
    expect(readPublicEnv({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: fakeKey })).toEqual(
      {
        googleMapsApiKey: fakeKey,
        problems: [],
      },
    );
  });

  it("treats a missing or empty key as fine: the map is just switched off", () => {
    const off = { googleMapsApiKey: null, problems: [] };
    expect(readPublicEnv({})).toEqual(off);
    expect(
      readPublicEnv({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined }),
    ).toEqual(off);
    expect(readPublicEnv({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: "" })).toEqual(off);
  });

  it("refuses a key that was pasted wrongly, and says so", () => {
    const wrong = [
      `"${fakeKey}"`, // quotation marks
      ` ${fakeKey}`, // a space in front
      `${fakeKey} `, // a space at the end
      `${fakeKey}\n`, // a line break
      "short",
      "x".repeat(101),
      `${fakeKey}!`,
      `key=${fakeKey}`,
    ];
    for (const value of wrong) {
      const result = readPublicEnv({ NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: value });
      expect(result.googleMapsApiKey).toBeNull();
      expect(result.problems).toHaveLength(1);
    }
  });

  it("never repeats the value it was given", () => {
    const secretish = "my-secret-value-that-is-not-a-key!";
    const result = readPublicEnv({
      NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: secretish,
    });
    expect(JSON.stringify(result)).not.toContain("secret");
  });
});
