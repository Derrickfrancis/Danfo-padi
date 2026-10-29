"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { PlaceMatch } from "@/lib/places";
import { parseRecentPlaces } from "@/lib/recent-places";
import {
  getServerRecentRaw,
  readRecentRaw,
  subscribeToRecent,
} from "@/lib/recent-places-store";

// The places this person searched for recently, newest first. The screen redraws when they change.
export function useRecentPlaces(): PlaceMatch[] {
  // We hand React the saved text, not the list, so it only redraws when the text really changed.
  const raw = useSyncExternalStore(
    subscribeToRecent,
    readRecentRaw,
    getServerRecentRaw,
  );
  return useMemo(() => parseRecentPlaces(raw), [raw]);
}
