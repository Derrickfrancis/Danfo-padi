import { describe, expect, it } from "vitest";
import nextConfig, {
  buildContentSecurityPolicy,
  buildSecurityHeaders,
} from "../../next.config";

// Reads a policy back into its parts: { "script-src": ["'self'", "'unsafe-inline'"], ... }
function directivesOf(policy: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const part of policy.split(";")) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) result[name] = sources;
  }
  return result;
}

function headerValue(isDevelopment: boolean, key: string): string | undefined {
  return buildSecurityHeaders(isDevelopment).find(
    (header) => header.key === key,
  )?.value;
}

describe("the Content-Security-Policy", () => {
  const production = directivesOf(buildContentSecurityPolicy(false));

  it("shuts off the things we never use", () => {
    expect(production["default-src"]).toEqual(["'self'"]);
    expect(production["object-src"]).toEqual(["'none'"]);
    expect(production["base-uri"]).toEqual(["'self'"]);
    expect(production["form-action"]).toEqual(["'self'"]);
    expect(production["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("allows only our own site, with no other website listed anywhere", () => {
    // If you add a map or analytics service later, this list is where it must be added on
    // purpose, and this test is what makes you notice.
    const allowed = new Set([
      "'self'",
      "'none'",
      "'unsafe-inline'",
      "blob:",
      "data:",
    ]);
    for (const [name, sources] of Object.entries(production)) {
      for (const source of sources) {
        expect(allowed.has(source), `${name} allows ${source}`).toBe(true);
      }
    }
  });

  it("allows live-reload tools only while developing", () => {
    expect(production["script-src"]).not.toContain("'unsafe-eval'");
    expect(production["connect-src"]).toEqual(["'self'"]);

    const development = directivesOf(buildContentSecurityPolicy(true));
    expect(development["script-src"]).toContain("'unsafe-eval'");
    expect(development["connect-src"]).toContain("ws:");
  });
});

describe("the other security headers", () => {
  it("asks for https-only in production and never while developing", () => {
    expect(headerValue(false, "Strict-Transport-Security")).toBe(
      "max-age=31536000",
    );
    expect(headerValue(true, "Strict-Transport-Security")).toBeUndefined();
  });

  it("gives each header one clean line, and none twice", () => {
    for (const isDevelopment of [false, true]) {
      const headers = buildSecurityHeaders(isDevelopment);
      const keys = headers.map((header) => header.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const header of headers) {
        expect(header.value.length).toBeGreaterThan(0);
        expect(header.value).not.toMatch(/[\r\n]/);
      }
    }
  });

  it("keeps the location and other powers tightly limited", () => {
    const permissions = headerValue(false, "Permissions-Policy") ?? "";
    expect(permissions).toContain("geolocation=(self)");
    expect(permissions).toContain("camera=()");
    expect(permissions).toContain("microphone=()");
    // Addresses hold coordinates, so they must never reach another website.
    expect(headerValue(false, "Referrer-Policy")).toBe("same-origin");
    expect(headerValue(false, "X-Content-Type-Options")).toBe("nosniff");
    expect(headerValue(false, "X-Frame-Options")).toBe("DENY");
  });
});

describe("the site settings", () => {
  it("apply the headers to every page and hide the framework name", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    // The test runs outside development, so it should get the production headers.
    expect(await nextConfig.headers?.()).toEqual([
      { source: "/:path*", headers: buildSecurityHeaders(false) },
    ]);
  });
});
