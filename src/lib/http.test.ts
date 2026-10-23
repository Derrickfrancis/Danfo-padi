import { describe, expect, it } from "vitest";
import { jsonResponse, readLimitedText } from "./http";

function post(body: string): Request {
  return new Request("http://localhost/test", { method: "POST", body });
}

describe("readLimitedText", () => {
  it("returns the text of a small body", async () => {
    expect(await readLimitedText(post("hello"), 10)).toBe("hello");
  });

  it("gives up on a body bigger than the limit", async () => {
    expect(await readLimitedText(post("a".repeat(100)), 50)).toBeNull();
  });

  it("allows exactly the limit and refuses one byte more", async () => {
    expect(await readLimitedText(post("a".repeat(50)), 50)).toBe(
      "a".repeat(50),
    );
    expect(await readLimitedText(post("a".repeat(51)), 50)).toBeNull();
  });

  it("counts bytes, not characters", async () => {
    // "é" takes two bytes, so 30 of them are 60 bytes, and 25 are exactly 50.
    expect(await readLimitedText(post("é".repeat(30)), 50)).toBeNull();
    expect(await readLimitedText(post("é".repeat(25)), 50)).toBe(
      "é".repeat(25),
    );
  });

  it("treats a missing body as empty text", async () => {
    const noBody = new Request("http://localhost/test", { method: "POST" });
    expect(await readLimitedText(noBody, 50)).toBe("");
  });

  it("keeps a character intact when it is split between two pieces", async () => {
    const bytes = new TextEncoder().encode("a€b"); // "€" is three bytes
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes.slice(0, 2)); // "a" and the first byte of "€"
        controller.enqueue(bytes.slice(2)); // the rest of "€", and "b"
        controller.close();
      },
    });
    const request = { body: stream } as unknown as Request;
    expect(await readLimitedText(request, 50)).toBe("a€b");
  });
});

describe("jsonResponse", () => {
  it("sends JSON with safe headers", async () => {
    const response = jsonResponse({ a: 1 }, 201);
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual({ a: 1 });
  });
});
