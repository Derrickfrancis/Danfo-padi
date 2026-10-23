import { describe, expect, it } from "vitest";
import { createRateLimiter, getClientKey } from "./rate-limit";

// A clock we control, so tests never wait for real time to pass.
function makeClock(start = 0) {
  let time = start;
  return {
    now: () => time,
    set: (value: number) => {
      time = value;
    },
  };
}

describe("createRateLimiter", () => {
  it("allows requests up to the limit, then refuses", () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      limit: 3,
      windowMs: 60_000,
      now: clock.now,
    });
    const results = [1, 2, 3, 4].map(() => limiter.check("a"));
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.map((r) => r.remaining)).toEqual([2, 1, 0, 0]);
  });

  it("tells a refused client how long to wait", () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: clock.now,
    });
    limiter.check("a");
    clock.set(10_000);
    const refused = limiter.check("a");
    expect(refused.allowed).toBe(false);
    expect(refused.retryAfterSeconds).toBe(50);
  });

  it("lets a client back in once the window is over", () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: clock.now,
    });
    limiter.check("a");
    expect(limiter.check("a").allowed).toBe(false);
    clock.set(60_001);
    expect(limiter.check("a").allowed).toBe(true);
  });

  it("counts each client separately", () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      limit: 1,
      windowMs: 60_000,
      now: clock.now,
    });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(true);
  });

  it("never remembers more clients than its limit, however many arrive", () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 60_000,
      maxKeys: 3,
      now: clock.now,
    });
    for (let i = 0; i < 10; i++) limiter.check(`client-${i}`);
    expect(limiter.size()).toBe(3);
  });

  it("forgets clients whose window is over before forgetting anyone still counting", () => {
    const clock = makeClock();
    const limiter = createRateLimiter({
      limit: 5,
      windowMs: 1000,
      maxKeys: 2,
      now: clock.now,
    });
    limiter.check("a"); // window ends at 1000
    clock.set(500);
    expect(limiter.check("b").remaining).toBe(4); // window ends at 1500
    clock.set(1200);
    limiter.check("c"); // full, so "a" (over) is forgotten, not "b"
    expect(limiter.check("b").remaining).toBe(3); // "b" kept its count
  });

  it("refuses nonsense settings", () => {
    expect(() => createRateLimiter({ limit: 0, windowMs: 1000 })).toThrow();
    expect(() => createRateLimiter({ limit: 1.5, windowMs: 1000 })).toThrow();
    expect(() =>
      createRateLimiter({ limit: 5, windowMs: Number.NaN }),
    ).toThrow();
    expect(() =>
      createRateLimiter({ limit: 5, windowMs: 1000, maxKeys: 0 }),
    ).toThrow();
  });
});

describe("getClientKey", () => {
  it("uses the first address in x-forwarded-for, trimmed", () => {
    expect(
      getClientKey(new Headers({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" })),
    ).toBe("203.0.113.5");
    expect(
      getClientKey(new Headers({ "x-forwarded-for": "  2001:db8::1  " })),
    ).toBe("2001:db8::1");
  });

  it("falls back to x-real-ip, then to unknown", () => {
    expect(getClientKey(new Headers({ "x-real-ip": "198.51.100.7" }))).toBe(
      "198.51.100.7",
    );
    expect(getClientKey(new Headers())).toBe("unknown");
  });

  it("refuses values that do not look like an address", () => {
    expect(
      getClientKey(
        new Headers({ "x-forwarded-for": "<script>alert(1)</script>" }),
      ),
    ).toBe("unknown");
    expect(
      getClientKey(new Headers({ "x-forwarded-for": "1".repeat(100) })),
    ).toBe("unknown");
    expect(
      getClientKey(
        new Headers({
          "x-forwarded-for": "garbage",
          "x-real-ip": "198.51.100.7",
        }),
      ),
    ).toBe("198.51.100.7");
  });
});
