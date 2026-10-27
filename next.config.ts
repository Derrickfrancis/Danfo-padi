import type { NextConfig } from "next";

type HeaderEntry = { key: string; value: string };

/* ---------- Browser security headers ----------
   These tell the browser what our pages are allowed to do. They are set here, in the
   config, so they apply to every page and stay compatible with fast page loading.
   The functions are exported only so a test can check them. */

// The Content-Security-Policy: a list of where each kind of content may come from.
export function buildContentSecurityPolicy(isDevelopment: boolean): string {
  const directives = [
    "default-src 'self'",
    // Next.js puts small inline scripts in every page, so inline scripts must be allowed.
    // The strictest alternative (a fresh secret for every single visit) cannot be combined
    // with the fast page loading this app relies on. Everything else below stays strict.
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // Only our own server may be talked to. (Development also needs its live-reload socket.)
    `connect-src 'self'${isDevelopment ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

export function buildSecurityHeaders(isDevelopment: boolean): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDevelopment),
    },
    // Do not guess what a file is. Use what we say it is.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Nobody may put our pages inside theirs. (Older browsers read this one.)
    { key: "X-Frame-Options", value: "DENY" },
    // Our addresses contain coordinates, so they are never sent to other websites.
    { key: "Referrer-Policy", value: "same-origin" },
    // Only our own pages may ask for the location. Nothing else is needed.
    {
      key: "Permissions-Policy",
      value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
  // "Always use https for this site." Browsers ignore it on plain http, so it is safe
  // to leave on in production, but it must only ship once the site really is https.
  if (!isDevelopment) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=31536000",
    });
  }
  return headers;
}

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Do not announce which framework we use.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: buildSecurityHeaders(isDevelopment) },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
