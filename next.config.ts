import type { NextConfig } from "next";

type HeaderEntry = { key: string; value: string };

/* ---------- Browser security headers ----------
   These tell the browser what our pages are allowed to do. They are set here, in the
   config, so they apply to every page and stay compatible with fast page loading.
   The functions are exported only so a test can check them. */
// The only Google hosts a page that shows a map may talk to. Named one by one on purpose:
// Google's own wildcard form (*.googleapis.com) would also let page code send data to places
// where anyone can host content. Google changes this list now and then, and recommends
// checking it every couple of months: https://developers.google.com/maps/domains
const GOOGLE_MAPS_SOURCES = {
  script: ["https://maps.googleapis.com"],
  connect: [
    "https://maps.googleapis.com",
    "https://mapsresources-pa.googleapis.com",
  ],
  img: [
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://mapsresources-pa.googleapis.com",
    "https://khms0.googleapis.com",
    "https://khms1.googleapis.com",
    "https://khms2.googleapis.com",
    "https://khms3.googleapis.com",
  ],
  style: ["https://fonts.googleapis.com"],
  font: ["https://fonts.gstatic.com"],
};

// The Content-Security-Policy: a list of where each kind of content may come from.
// withMaps is true only for pages that show a map.
export function buildContentSecurityPolicy(
  isDevelopment: boolean,
  withMaps = false,
): string {
  const maps = withMaps
    ? GOOGLE_MAPS_SOURCES
    : { script: [], connect: [], img: [], style: [], font: [] };
  const list = (...sources: string[]) => sources.join(" ");
  const directives = [
    "default-src 'self'",
    // Next.js puts small inline scripts in every page, so inline scripts must be allowed.
    // The strictest alternative (a fresh secret for every single visit) cannot be combined
    // with the fast page loading this app relies on. Everything else below stays strict.
    `script-src ${list("'self'", "'unsafe-inline'", ...(isDevelopment ? ["'unsafe-eval'"] : []), ...maps.script)}`,
    `style-src ${list("'self'", "'unsafe-inline'", ...maps.style)}`,
    `img-src ${list("'self'", "blob:", "data:", ...maps.img)}`,
    `font-src ${list("'self'", ...maps.font)}`,
    // Only our own server may be talked to. (Development also needs its live-reload socket.)
    `connect-src ${list("'self'", ...(isDevelopment ? ["ws:", "wss:"] : []), ...maps.connect)}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  return directives.join("; ");
}

export function buildSecurityHeaders(
  isDevelopment: boolean,
  withMaps = false,
): HeaderEntry[] {
  const headers: HeaderEntry[] = [
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(isDevelopment, withMaps),
    },
    // Do not guess what a file is. Use what we say it is.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Nobody may put our pages inside theirs. (Older browsers read this one.)
    { key: "X-Frame-Options", value: "DENY" },
    // Our addresses contain coordinates, so they are never sent to other websites. Map pages
    // need Google to see which site is asking (that is how a key's website restriction
    // works), so they send other sites our site's name only, never the full address.
    {
      key: "Referrer-Policy",
      value: withMaps ? "strict-origin-when-cross-origin" : "same-origin",
    },
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
      // Pages that show a map may talk to Google, and only those pages. When two rules
      // set the same header, the later one wins.
      { source: "/trip", headers: buildSecurityHeaders(isDevelopment, true) },
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
