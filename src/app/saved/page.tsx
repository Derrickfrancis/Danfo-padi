"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import { ChevronLeftIcon } from "@/components/Icons";
import { useHydrated } from "@/hooks/useHydrated";
import { useSavedTrips } from "@/hooks/useSavedTrips";
import { unsaveTrip } from "@/lib/saved-trips-store";
import { formatNaira } from "@/lib/trip-format";
import { iconButton } from "@/lib/ui";

export default function SavedPage() {
  const hydrated = useHydrated();
  const trips = useSavedTrips();

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href="/home" className={iconButton} aria-label="Back to home">
          <ChevronLeftIcon />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold">Saved trips</h1>
          <p className="text-[13px] text-muted">Your routes in one place</p>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-6">
        {!hydrated && (
          <div
            role="status"
            className="h-20 rounded-card bg-primary-light motion-safe:animate-pulse"
          >
            <span className="sr-only">Loading saved trips...</span>
          </div>
        )}

        {hydrated && trips.length === 0 && (
          <div className="rounded-card border border-dashed border-line p-4">
            <p className="text-sm font-bold text-primary">
              Save a trip from any route
            </p>
            <p className="mt-1 text-[13px] leading-normal text-muted">
              Open a fare breakdown and tap &ldquo;Save this trip&rdquo;. Saved
              trips stay on this phone only.
            </p>
          </div>
        )}

        {hydrated && trips.length > 0 && (
          <ul className="flex flex-col gap-3">
            {trips.map((trip) => (
              <li
                key={trip.href}
                className="flex items-center gap-2 rounded-card border border-line-mid p-4"
              >
                <Link
                  href={trip.href}
                  prefetch={false}
                  className="min-w-0 flex-1"
                >
                  <p className="text-[15px] leading-snug font-bold">
                    {trip.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {`${trip.via} · ${formatNaira(trip.fareMin, trip.fareMax)}${trip.estimate ? " est." : ""}`}
                  </p>
                </Link>
                <button
                  type="button"
                  onClick={() => unsaveTrip(trip.href)}
                  aria-label={`Remove saved trip: ${trip.title}, ${trip.via}`}
                  className="min-h-11 flex-none px-3 text-[13px] font-bold text-primary-deep"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </AppShell>
  );
}
