import {
  addRecentPlace,
  parseRecentPlaces,
  serializeRecentPlaces,
} from "./recent-places";
import type { PlaceMatch } from "./places";

const STORAGE_KEY = "dp.recent.v1";

// Browsers tell us when ANOTHER tab changes storage, but not when this tab does.
// So we announce our own changes with this event name.
const RECENT_CHANGED = "dp:recent-changed";

// React calls this once and gets back a way to stop listening.
export function subscribeToRecent(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(RECENT_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(RECENT_CHANGED, onChange);
  };
}

// The recent places as text, or "" if there are none or the phone will not let us look.
export function readRecentRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// What the server uses while building the page. It cannot see the phone.
export function getServerRecentRaw(): string {
  return "";
}

// Remembers places in the order given, so the last one ends up newest.
// Returns false if the phone would not let us save, for example in private browsing.
export function rememberPlaces(places: readonly PlaceMatch[]): boolean {
  if (places.length === 0) return true;
  const updated = places.reduce(
    addRecentPlace,
    parseRecentPlaces(readRecentRaw()),
  );
  try {
    localStorage.setItem(STORAGE_KEY, serializeRecentPlaces(updated));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(RECENT_CHANGED));
  return true;
}
