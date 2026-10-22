"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import { DotIcon, PinIcon, PlusIcon, TargetIcon, WarningIcon } from "@/components/Icons";
import { primaryButton } from "@/lib/ui";

type LocateStatus = "idle" | "finding" | "found" | "denied" | "unsupported";

const HINTS: Record<LocateStatus, string> = {
  idle: "Tap the target icon to use your location",
  finding: "Finding where you dey...",
  found: "Location found",
  denied: "We could not get your location. Type where you dey.",
  unsupported: "This phone cannot share its location. Type where you dey.",
};

// Sample data for now. Phase 6 replaces this with the person's real recent searches.
const RECENT_PLACES = ["National Orthopaedic Hospital", "Oshodi"];

export default function HomePage() {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [status, setStatus] = useState<LocateStatus>("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("finding");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        // Phase 4 turns these coordinates into a street address.
        setFrom("My current location");
        setStatus("found");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  function onFromChange(value: string) {
    setFrom(value);
    setCoords(null);
    setStatus("idle");
  }

  const canSearch = from.trim().length > 0 && to.trim().length > 0;

  function findRoutes(e: React.FormEvent) {
    e.preventDefault();
    if (!canSearch) return;
    const q = new URLSearchParams({ from: from.trim(), to: to.trim() });
    if (coords) {
      q.set("lat", String(coords.lat));
      q.set("lng", String(coords.lng));
    }
    router.push(`/routes?${q.toString()}`);
  }

  const rowClass =
    "flex items-center gap-3 rounded-chip text-primary focus-within:outline-3 focus-within:-outline-offset-2 focus-within:outline-glow";
  const inputClass =
    "h-12 w-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-muted";

  return (
    <AppShell>
      <form id="route-search" onSubmit={findRoutes}>
        <div className="rounded-b-sheet bg-primary px-6 pt-safe pb-[22px] text-white">
          <div className="text-lg font-extrabold">Danfo Padi</div>
          <h1 className="mt-4 mb-[18px] text-[28px] leading-[1.2] font-extrabold">Know which bus or keke to take</h1>

          <div className="rounded-card bg-white py-1 pr-2 pl-4 text-ink">
            <div className={rowClass}>
              <DotIcon className="flex-none" />
              <input
                className={inputClass}
                aria-label="Where you Dey"
                placeholder="Where you Dey"
                value={from}
                onChange={(e) => onFromChange(e.target.value)}
                autoComplete="off"
              />
              <button
                type="button"
                className="flex h-11 w-11 flex-none items-center justify-center rounded-pill border-0 bg-primary-light text-primary"
                aria-label="Use my current location"
                onClick={locate}
              >
                <TargetIcon />
              </button>
            </div>
            <div className="mr-2 h-px bg-line-mid" />
            <div className={rowClass}>
              <PinIcon className="flex-none" />
              <input
                className={inputClass}
                aria-label="Where you Dey go"
                placeholder="Where you Dey go"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                autoComplete="off"
              />
            </div>
          </div>

          <p className="mt-3 min-h-[1.3em] text-[13px] font-semibold" role="status" aria-live="polite">
            {HINTS[status]}
          </p>
        </div>
      </form>

      <div className="flex flex-col gap-4 px-6 py-5">
        <button type="submit" form="route-search" className={primaryButton} disabled={!canSearch}>
          Find routes
        </button>

        <div className="flex gap-3">
          <Link href="/add-route" className="flex flex-1 flex-col gap-2.5 rounded-card bg-primary-light p-3.5 text-sm leading-snug font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
              <PlusIcon size={22} />
            </span>
            Add a route
          </Link>
          <Link href="/report-road" className="flex flex-1 flex-col gap-2.5 rounded-card bg-primary-light p-3.5 text-sm leading-snug font-bold">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
              <WarningIcon size={22} />
            </span>
            Report a road problem
          </Link>
        </div>

        <h2 className="mt-1 text-sm font-bold text-muted">Recent places</h2>
        <ul className="flex flex-col gap-3.5">
          {RECENT_PLACES.map((place) => (
            <li key={place}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3.5 border-0 bg-transparent p-0 text-left text-base font-semibold"
                onClick={() => setTo(place)}
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary-light text-primary">
                  <PinIcon />
                </span>
                {place}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <BottomNav />
    </AppShell>
  );
}
