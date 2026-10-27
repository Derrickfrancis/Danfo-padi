import {
  addSavedTrip,
  parseSavedTrips,
  removeSavedTrip,
  serializeSavedTrips,
  type SavedTrip,
} from "./saved-trips";

const STORAGE_KEY = "dp.saved.v1";

// Browsers tell us when ANOTHER tab changes storage, but not when this tab does.
// So we announce our own changes with this event name.
const SAVED_CHANGED = "dp:saved-changed";

// React calls this once and gets back a way to stop listening.
export function subscribeToSaved(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(SAVED_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(SAVED_CHANGED, onChange);
  };
}

// The saved list as text, or "" if there is none or the phone will not let us look.
export function readSavedRaw(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

// What the server uses while building the page. It cannot see the phone.
export function getServerSavedRaw(): string {
  return "";
}

// Returns false if the phone would not let us save, for example in private browsing.
function write(trips: readonly SavedTrip[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSavedTrips(trips));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(SAVED_CHANGED));
  return true;
}

export function saveTrip(trip: SavedTrip): boolean {
  return write(addSavedTrip(parseSavedTrips(readSavedRaw()), trip));
}

export function unsaveTrip(href: string): boolean {
  return write(removeSavedTrip(parseSavedTrips(readSavedRaw()), href));
}
