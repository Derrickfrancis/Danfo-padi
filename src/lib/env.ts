import { z } from "zod";

// A Google key is a run of letters, digits, dashes and underscores. We do not check the
// exact format Google uses today, only that nothing odd was pasted in: spaces, quotes,
// a line break, or a whole sentence.
const GoogleMapsKey = z.string().regex(/^[A-Za-z0-9_-]{20,100}$/);

export type PublicEnv = {
  googleMapsApiKey: string | null; // null means the map stays switched off
  problems: string[]; // plain sentences for us. They never contain the value itself.
};

type RawPublicEnv = { NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?: string | undefined };

// Reads the settings that are safe to show in the browser. A missing key is fine:
// the app simply works without a map. A key that looks wrong is reported and not used.
export function readPublicEnv(raw: RawPublicEnv): PublicEnv {
  const value = raw.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (value === undefined || value === "") {
    return { googleMapsApiKey: null, problems: [] };
  }

  const parsed = GoogleMapsKey.safeParse(value);
  if (!parsed.success) {
    return {
      googleMapsApiKey: null,
      problems: [
        "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY does not look like a Google key. Check for spaces, quotes, or a missing part.",
      ],
    };
  }

  return { googleMapsApiKey: parsed.data, problems: [] };
}

// Next.js only fills in NEXT_PUBLIC_ settings when each one is written out by name like
// this, so we list them one by one instead of passing the whole of process.env along.
export const publicEnv: PublicEnv = readPublicEnv({
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
});
