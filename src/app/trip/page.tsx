import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { FareBreakdown } from "@/components/FareBreakdown";
import { ChevronLeftIcon } from "@/components/Icons";
import { Message } from "@/components/Message";
import { getNetwork } from "@/lib/data";
import { createRateLimiter, getClientKey } from "@/lib/rate-limit";
import { buildRoutesHref, type RawParams } from "@/lib/routes-query";
import { searchTrips } from "@/lib/search";
import { viaLabel } from "@/lib/trip-format";
import { buildTripHref, parseTripQuery } from "@/lib/trip-query";
import { iconButton } from "@/lib/ui";

// Every visit to this page runs a search, so it has its own limit too.
const tripLimiter = createRateLimiter({ limit: 30, windowMs: 60_000 });

type TripPageProps = { searchParams: Promise<RawParams> };

// What shows for a moment while the search runs. It must not read anything per visitor.
function TripLoading() {
  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href="/home" className={iconButton} aria-label="Back to home">
          <ChevronLeftIcon />
        </Link>
        <div className="h-10 w-48 rounded-chip bg-primary-light motion-safe:animate-pulse" />
      </header>
      <div className="flex flex-col gap-4 px-6" role="status">
        {[0, 1, 2].map((block) => (
          <div
            key={block}
            className="h-28 rounded-card bg-primary-light motion-safe:animate-pulse"
          />
        ))}
        <span className="sr-only">Loading the fare breakdown...</span>
      </div>
    </AppShell>
  );
}

// The page itself reads nothing per visitor. It hands the address to the part inside
// the placeholder, so the loading screen can be sent to the phone immediately.
export default function TripPage({ searchParams }: TripPageProps) {
  return (
    <Suspense fallback={<TripLoading />}>
      <TripContent searchParams={searchParams} />
    </Suspense>
  );
}

async function TripContent({ searchParams }: TripPageProps) {
  // Says: everything below is decided fresh for each visitor, at the moment they arrive.
  await connection();

  // First gate: has this client asked too often?
  const rate = tripLimiter.check(getClientKey(await headers()));
  if (!rate.allowed) {
    return (
      <Message
        title="Too many searches"
        text="Wait a moment, then try again."
      />
    );
  }

  // Second gate: is the address exactly what we expect? We say nothing about why not.
  const parsed = parseTripQuery(await searchParams);
  if (!parsed.ok) {
    return (
      <Message
        title="This link is not valid"
        text="Go back and search again."
      />
    );
  }

  // We never trust the trip id. We run the search again and look for it in the results.
  const { origin, destination, tripId } = parsed.data;
  const network = await getNetwork();
  const trip = searchTrips(network, origin, destination).find(
    (option) => option.journey.id === tripId,
  );
  const routesHref = buildRoutesHref(origin, destination, "best");

  if (!trip) {
    return (
      <Message
        title="This trip is no longer available"
        text="Routes change as we add and check data. Go back and search again."
        href={routesHref}
        actionLabel="Back to routes"
      />
    );
  }

  const stopNames = new Map(network.stops.map((stop) => [stop.id, stop.name]));
  const via = viaLabel(trip.journey.legs, (id) => stopNames.get(id));
  const save = {
    href: buildTripHref(origin, destination, tripId),
    // Kept short enough that the saved list will always accept it.
    title: `${trip.access.stop.area} to ${trip.egress.stop.name}`.slice(0, 200),
    via: via.slice(0, 200),
  };

  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link
          href={routesHref}
          className={iconButton}
          aria-label="Back to routes"
        >
          <ChevronLeftIcon />
        </Link>
        <div className="min-w-0">
          <h1 className="text-lg leading-tight font-extrabold">
            Fare breakdown
          </h1>
          <p className="text-[13px] text-muted">{via}</p>
        </div>
      </header>
      <FareBreakdown trip={trip} save={save} />
    </AppShell>
  );
}
