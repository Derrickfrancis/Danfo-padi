"use client";

import { useMemo, useSyncExternalStore } from "react";
import { parseSavedTrips, type SavedTrip } from "@/lib/saved-trips";
import {
  getServerSavedRaw,
  readSavedRaw,
  subscribeToSaved,
} from "@/lib/saved-trips-store";

// The trips saved on this phone, newest first. The screen redraws when they change.
export function useSavedTrips(): SavedTrip[] {
  // We hand React the saved text, not the list: text can be compared by value, so React
  // only redraws when it really changed. Turning it into a list happens once per change.
  const raw = useSyncExternalStore(
    subscribeToSaved,
    readSavedRaw,
    getServerSavedRaw,
  );
  return useMemo(() => parseSavedTrips(raw), [raw]);
}
