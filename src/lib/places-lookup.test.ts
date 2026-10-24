import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FetchPlacesResult } from "./places-client";
import { scheduleLookup, SUGGESTION_DELAY_MS } from "./places-lookup";

const found: FetchPlacesResult = {
  ok: true,
  places: [
    {
      id: "stop_ishaga",
      name: "Ishaga bus stop",
      area: "Isolo",
      lat: 6.533,
      lng: 3.329,
    },
  ],
};

// Fake timers let the tests move the clock forward instantly instead of waiting.
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("scheduleLookup", () => {
  it("waits for a pause in typing before asking, then passes the answer on", async () => {
    const asked: string[] = [];
    const results: FetchPlacesResult[] = [];
    scheduleLookup("ish", {
      fetcher: async (query) => {
        asked.push(query);
        return found;
      },
      onResult: (result) => results.push(result),
    });

    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS - 1);
    expect(asked).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(asked).toEqual(["ish"]);
    expect(results).toEqual([found]);
  });

  it("lets a newer lookup replace an older one that has not started", async () => {
    const asked: string[] = [];
    const fetcher = async (query: string) => {
      asked.push(query);
      return found;
    };

    const cancelFirst = scheduleLookup("is", { fetcher, onResult: () => {} });
    await vi.advanceTimersByTimeAsync(100);
    cancelFirst();
    scheduleLookup("ish", { fetcher, onResult: () => {} });
    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS);

    expect(asked).toEqual(["ish"]);
  });

  it("makes no request at all if cancelled during the pause", async () => {
    const asked: string[] = [];
    const cancel = scheduleLookup("ish", {
      fetcher: async (query) => {
        asked.push(query);
        return found;
      },
      onResult: () => {},
    });

    cancel();
    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS * 2);
    expect(asked).toEqual([]);
  });

  it("drops an answer that arrives after cancelling, and tells the request to stop", async () => {
    const signals: AbortSignal[] = [];
    const releases: Array<(result: FetchPlacesResult) => void> = [];
    const results: FetchPlacesResult[] = [];

    const cancel = scheduleLookup("ish", {
      fetcher: (query, signal) => {
        signals.push(signal);
        return new Promise<FetchPlacesResult>((resolve) => {
          releases.push(resolve);
        });
      },
      onResult: (result) => results.push(result),
    });

    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS);
    expect(signals[0].aborted).toBe(false);

    cancel();
    expect(signals[0].aborted).toBe(true);

    releases[0](found); // the late answer finally arrives
    await vi.advanceTimersByTimeAsync(1);
    expect(results).toEqual([]);
  });

  it("does not report a request that was cancelled on purpose", async () => {
    const results: FetchPlacesResult[] = [];
    scheduleLookup("ish", {
      fetcher: async () => ({ ok: false, reason: "aborted" }),
      onResult: (result) => results.push(result),
    });

    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS);
    expect(results).toEqual([]);
  });

  it("passes on real failures so the screen can say something", async () => {
    const limited: FetchPlacesResult = { ok: false, reason: "rate_limited" };
    const results: FetchPlacesResult[] = [];
    scheduleLookup("ish", {
      fetcher: async () => limited,
      onResult: (result) => results.push(result),
    });

    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS);
    expect(results).toEqual([limited]);
  });

  it("turns a crashing fetcher into a network failure instead of an unhandled error", async () => {
    const results: FetchPlacesResult[] = [];
    scheduleLookup("ish", {
      fetcher: async () => {
        throw new Error("boom");
      },
      onResult: (result) => results.push(result),
    });

    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS);
    expect(results).toEqual([{ ok: false, reason: "network" }]);
  });

  it("is harmless to cancel twice, or after it has finished", async () => {
    const cancel = scheduleLookup("ish", {
      fetcher: async () => found,
      onResult: () => {},
    });
    await vi.advanceTimersByTimeAsync(SUGGESTION_DELAY_MS);
    expect(() => {
      cancel();
      cancel();
    }).not.toThrow();
  });
});
