"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import {
  DotIcon,
  PinIcon,
  PlusIcon,
  TargetIcon,
  WarningIcon,
} from "@/components/Icons";
import { PlaceField } from "@/components/PlaceField";
import { LAGOS_BOUNDS } from "@/lib/api";
import type { PlaceMatch } from "@/lib/places";
import { primaryButton } from "@/lib/ui";

type LocateStatus =
  | "idle"
  | "finding"
  | "found"
  | "denied"
  | "unsupported"
  | "outside";

// A place the person has picked: a name to show, and a spot on the map to search from.
type Chosen = { label: string; lat: number; lng: number };

const HINTS: Record<LocateStatus, string> = {
  idle: "Tap the target icon to use your location",
  finding: "Finding where you dey...",
  found: "Location found",
  denied: "We could not get your location. Type where you dey.",
  unsupported: "This phone cannot share its location. Type where you dey.",
  outside: "We only cover Lagos for now. Type where you dey.",
};

// Sample data for now. A later phase replaces this with the person's real recent searches.
const RECENT_PLACES: PlaceMatch[] = [
  {
    id: "stop_hospital",
    name: "National Orthopaedic Hospital",
    area: "Igbobi",
    lat: 6.53,
    lng: 3.379,
  },
  { id: "stop_oshodi", name: "Oshodi", area: "Oshodi", lat: 6.556, lng: 3.344 },
];

function toChosen(place: PlaceMatch): Chosen {
  return { label: place.name, lat: place.lat, lng: place.lng };
}

function isInsideLagos(lat: number, lng: number): boolean {
  return (
    lat >= LAGOS_BOUNDS.minLat &&
    lat <= LAGOS_BOUNDS.maxLat &&
    lng >= LAGOS_BOUNDS.minLng &&
    lng <= LAGOS_BOUNDS.maxLng
  );
}

// Rounds to 3 decimal places, about 100 metres. Addresses are saved in browser
// history and server logs, so we do not put an exact position in one.
function roundForPrivacy(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export default function HomePage() {
  const router = useRouter();
  const [fromText, setFromText] = useState("");
  const [from, setFrom] = useState<Chosen | null>(null);
  const [toText, setToText] = useState("");
  const [to, setTo] = useState<Chosen | null>(null);
  const [status, setStatus] = useState<LocateStatus>("idle");

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("finding");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = roundForPrivacy(pos.coords.latitude);
        const lng = roundForPrivacy(pos.coords.longitude);
        if (!isInsideLagos(lat, lng)) {
          setStatus("outside");
          return;
        }
        setFromText("My current location");
        setFrom({ label: "My current location", lat, lng });
        setStatus("found");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }

  // Typing again undoes the choice, so the box can never say one thing and mean another.
  function changeFrom(text: string) {
    setFromText(text);
    setFrom(null);
    setStatus("idle");
  }

  function pickFrom(place: PlaceMatch) {
    setFromText(place.name);
    setFrom(toChosen(place));
    setStatus("idle");
  }

  function changeTo(text: string) {
    setToText(text);
    setTo(null);
  }

  function pickTo(place: PlaceMatch) {
    setToText(place.name);
    setTo(toChosen(place));
  }

  function findRoutes(e: FormEvent) {
    e.preventDefault();
    if (!from || !to) return;
    const q = new URLSearchParams({
      olat: String(from.lat),
      olng: String(from.lng),
      dlat: String(to.lat),
      dlng: String(to.lng),
    });
    router.push(`/routes?${q.toString()}`);
  }

  const typedButNotPicked =
    (fromText.trim() !== "" && !from) || (toText.trim() !== "" && !to);
  const hint =
    status !== "idle"
      ? HINTS[status]
      : typedButNotPicked
        ? "Pick a place from the list to continue"
        : HINTS.idle;

  return (
    <AppShell>
      <form id="route-search" onSubmit={findRoutes}>
        <div className="rounded-b-sheet bg-primary px-6 pt-safe pb5.5 text-white">
          <div className="text-lg font-extrabold">Danfo Padi</div>
          <h1 className="mt-4 mb-4.5 text-[28px] leading-[1.2] font-extrabold">
            Know which bus or keke to take
          </h1>

          <div className="rounded-card bg-white py-1 pr-2 pl-4 text-ink">
            <PlaceField
              label="Where you Dey"
              placeholder="Where you Dey"
              icon={<DotIcon className="flex-none" />}
              text={fromText}
              isChosen={from !== null}
              onTextChange={changeFrom}
              onPick={pickFrom}
              trailing={
                <button
                  type="button"
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-pill border-0 bg-primary-light text-primary"
                  aria-label="Use my current location"
                  onClick={locate}
                >
                  <TargetIcon />
                </button>
              }
            />
            <div className="mr-2 h-px bg-line-mid" />
            <PlaceField
              label="Where you Dey go"
              placeholder="Where you Dey go"
              icon={<PinIcon className="flex-none" />}
              text={toText}
              isChosen={to !== null}
              onTextChange={changeTo}
              onPick={pickTo}
            />
          </div>

          <p
            className="mt-3 min-h-[1.3em] text-[13px] font-semibold"
            role="status"
            aria-live="polite"
          >
            {hint}
          </p>
        </div>
      </form>

      <div className="flex flex-col gap-4 px-6 py-5">
        <button
          type="submit"
          form="route-search"
          className={primaryButton}
          disabled={!from || !to}
        >
          Find routes
        </button>

        <div className="flex gap-3">
          <Link
            href="/add-route"
            className="flex flex-1 flex-col gap-2.5 rounded-card bg-primary-light p-3.5 text-sm leading-snug font-bold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
              <PlusIcon size={22} />
            </span>
            Add a route
          </Link>
          <Link
            href="/report-road"
            className="flex flex-1 flex-col gap-2.5 rounded-card bg-primary-light p-3.5 text-sm leading-snug font-bold"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-primary">
              <WarningIcon size={22} />
            </span>
            Report a road problem
          </Link>
        </div>

        <h2 className="mt-1 text-sm font-bold text-muted">Recent places</h2>
        <ul className="flex flex-col gap-3.5">
          {RECENT_PLACES.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center gap-3.5 border-0 bg-transparent p-0 text-left text-base font-semibold"
                onClick={() => pickTo(place)}
              >
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary-light text-primary">
                  <PinIcon />
                </span>
                {place.name}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <BottomNav />
    </AppShell>
  );
}
