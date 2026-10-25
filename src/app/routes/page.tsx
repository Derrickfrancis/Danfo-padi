import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { ChevronLeftIcon } from "@/components/Icons";
import { RouteTabs } from "@/components/RouteTabs";
import { TripCard } from "@/components/TripCard";
import { getNetwork } from "@/lib/data";
import { sortJourneys } from "@/lib/ranking";
import { createRateLimiter, getClientKey } from "@/lib/rate-limit";
import { parseRoutesQuery, type RawParams } from "@/lib/routes-query";
import { searchTrips } from "@/lib/search";
import { describeStart, viaLabel } from "@/lib/trip-format";
import { iconButton, primaryButton } from "@/lib/ui";

// Every visit to this page runs a search, so it has its own limit too.
const pageLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

type RoutesPageProps = { searchParams: Promise<RawParams> };

// A simple screen for when there is nothing to show: a bad link, too many tries, no routes.
function Message({ title, text }: { title: string; text: ReactNode }) {
  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href="/home" className={iconButton} aria-label="Back to home">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-lg font-extrabold">{title}</h1>
      </header>
      <div className="flex flex-col gap-4 px-6">
        <p className="text-[15px] leading-normal text-muted">{text}</p>
        <Link href="/home" className={primaryButton}>
          Search again
        </Link>
      </div>
    </AppShell>
  );
}

// What shows for a moment while the search runs. It is the same shape as the real
// screen, so nothing jumps when the cards arrive. It must not read anything per visitor.
function RoutesLoading() {
  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href="/home" className={iconButton} aria-label="Back to home">
          <ChevronLeftIcon />
        </Link>
        <div className="h-10 w-48 rounded-chip bg-primary-light motion-safe:animate-pulse" />
      </header>
      <div className="flex gap-2 px-6">
        {[0, 1, 2].map((tab) => (
          <div
            key={tab}
            className="h-11 w-24 rounded-pill bg-primary-light motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="flex flex-col gap-4 px-6 pt-4" role="status">
        {[0, 1].map((card) => (
          <div
            key={card}
            className="h-72 rounded-card bg-primary-light motion-safe:animate-pulse"
          />
        ))}
        <span className="sr-only">Finding routes...</span>
      </div>
    </AppShell>
  );
}

// The page itself reads nothing per visitor. It hands the address to the part inside
// the placeholder, so the loading screen can be sent to the phone immediately.
export default function RoutesPage({ searchParams }: RoutesPageProps) {
  return (
    <Suspense fallback={<RoutesLoading />}>
      <RoutesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function RoutesContent({ searchParams }: RoutesPageProps) {
  // Says: everything below is decided fresh for each visitor, at the moment they arrive.
  // The rate limiter reads the clock, and Next.js only allows that after this line.
  await connection();

  // First gate: has this client searched too often?
  const rate = pageLimiter.check(getClientKey(await headers()));
  if (!rate.allowed) {
    return (
      <Message
        title="Too many searches"
        text="Wait a moment, then try again."
      />
    );
  }

  // Second gate: is the address exactly what we expect? We say nothing about why not.
  const parsed = parseRoutesQuery(await searchParams);
  if (!parsed.ok) {
    return (
      <Message
        title="This link is not valid"
        text="Go back and search again."
      />
    );
  }

  const { origin, destination, sort } = parsed.data;
  const network = await getNetwork();
  const ranked = searchTrips(network, origin, destination);

  if (ranked.length === 0) {
    return (
      <Message
        title="No routes found yet"
        text="We only know a few routes so far, and none of them connect these two places yet."
      />
    );
  }

  const trips = sortJourneys(ranked, sort);
  const first = ranked[0];
  const stopNames = new Map(network.stops.map((stop) => [stop.id, stop.name]));

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href="/home" className={iconButton} aria-label="Back to home">
          <ChevronLeftIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-extrabold">
            {first.access.stop.area} to {first.egress.stop.name}
          </h1>
          <p className="text-[13px] text-muted">
            {describeStart(first.access)}
          </p>
        </div>
      </header>

      <RouteTabs active={sort} origin={origin} destination={destination} />

      {sort === "fastest" && (
        <p className="mx-6 mt-3 rounded-chip bg-primary-light px-3.5 py-2.5 text-[13px] font-semibold text-primary-deep">
          Times are estimates and can change with traffic
        </p>
      )}

      <div className="flex flex-col gap-4 px-6 pt-4 pb-safe">
        {trips.map((trip, index) => (
          <TripCard
            key={trip.journey.id}
            trip={trip}
            title={viaLabel(trip.journey.legs, (id) => stopNames.get(id))}
            highlighted={sort !== "best" && index === 0}
          />
        ))}
      </div>
    </AppShell>
  );
}
