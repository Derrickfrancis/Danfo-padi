import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMapsScriptUrl,
  loadGoogleMaps,
  MapsLoadError,
  onMapsAuthFailure,
  resetMapsLoaderForTests,
} from "./google-maps-loader";

type FakeScript = {
  src: string;
  async: boolean;
  onload: (() => void) | null;
  onerror: (() => void) | null;
  removed: boolean;
  remove: () => void;
};

// A pretend page that records the scripts added to it, so nothing really loads.
function installFakePage() {
  const added: FakeScript[] = [];
  const fakeWindow: { gm_authFailure?: () => void } = {};
  vi.stubGlobal("window", fakeWindow);
  vi.stubGlobal("document", {
    createElement: () => {
      const script: FakeScript = {
        src: "",
        async: false,
        onload: null,
        onerror: null,
        removed: false,
        remove() {
          script.removed = true;
        },
      };
      return script;
    },
    head: {
      appendChild: (script: FakeScript) => {
        added.push(script);
      },
    },
  });
  return { added, fakeWindow };
}

beforeEach(() => {
  resetMapsLoaderForTests();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildMapsScriptUrl", () => {
  it("points only at Google's loader, with our settings", () => {
    const url = new URL(buildMapsScriptUrl("AIza-test_key"));
    expect(url.origin).toBe("https://maps.googleapis.com");
    expect(url.pathname).toBe("/maps/api/js");
    expect(url.searchParams.get("key")).toBe("AIza-test_key");
    expect(url.searchParams.get("loading")).toBe("async");
    expect(url.searchParams.get("v")).toBe("quarterly");
    expect(url.searchParams.get("region")).toBe("NG");
  });

  it("writes odd characters safely so they cannot change the address", () => {
    const url = new URL(buildMapsScriptUrl("a&callback=evil#x"));
    expect(url.searchParams.get("key")).toBe("a&callback=evil#x");
    expect(url.searchParams.get("callback")).toBeNull();
    expect(url.hash).toBe("");
  });
});

describe("loadGoogleMaps", () => {
  it("adds the script once, however many times it is asked", () => {
    const { added } = installFakePage();
    const first = loadGoogleMaps("AIza-test_key");
    const second = loadGoogleMaps("AIza-test_key");
    expect(added).toHaveLength(1);
    expect(second).toBe(first);
    expect(added[0].async).toBe(true);
    expect(
      added[0].src.startsWith("https://maps.googleapis.com/maps/api/js?"),
    ).toBe(true);
  });

  it("finishes when Google's script has loaded", async () => {
    const { added } = installFakePage();
    const loaded = loadGoogleMaps("AIza-test_key");
    added[0].onload?.();
    await loaded;
    // Asking again after it has loaded adds nothing and still succeeds.
    await loadGoogleMaps("AIza-test_key");
    expect(added).toHaveLength(1);
  });

  it("fails clearly when the script cannot be fetched, cleans up, and lets a later try start again", async () => {
    const { added } = installFakePage();
    const attempt = loadGoogleMaps("AIza-test_key");
    added[0].onerror?.();

    const error = await attempt.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(MapsLoadError);
    expect((error as MapsLoadError).reason).toBe("network");
    expect(added[0].removed).toBe(true);

    void loadGoogleMaps("AIza-test_key");
    expect(added).toHaveLength(2);
  });

  it("tells listeners when Google rejects the key, until they stop listening", () => {
    const { fakeWindow } = installFakePage();
    void loadGoogleMaps("AIza-test_key");

    let told = 0;
    const stop = onMapsAuthFailure(() => {
      told += 1;
    });
    fakeWindow.gm_authFailure?.();
    expect(told).toBe(1);

    stop();
    fakeWindow.gm_authFailure?.();
    expect(told).toBe(1);
  });
});
