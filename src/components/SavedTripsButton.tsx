"use client";

import { useState } from "react";
import { useSavedTrips } from "@/hooks/useSavedTrips";
import { isSaved, type SavedTripInput } from "@/lib/saved-trips";
import { saveTrip, unsaveTrip } from "@/lib/saved-trips-store";

// Keeps a trip on this phone, or takes it off again.
export function SaveTripButton({ trip }: { trip: SavedTripInput }) {
  const savedTrips = useSavedTrips();
  const saved = isSaved(savedTrips, trip.href);
  const [failed, setFailed] = useState(false);

  function toggle() {
    const worked = saved
      ? unsaveTrip(trip.href)
      : saveTrip({ ...trip, savedAt: Date.now() });
    setFailed(!worked);
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={`flex min-h-11 w-full items-center justify-center rounded-field border border-line-mid text-sm font-bold text-primary ${
          saved ? "bg-primary-light" : "bg-white"
        }`}
      >
        {saved ? "Saved. Tap to remove" : "Save this trip"}
      </button>
      {failed && (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          This phone would not let us save the trip. Private browsing can cause
          this.
        </p>
      )}
    </div>
  );
}
