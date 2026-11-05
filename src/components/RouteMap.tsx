"use client";

import { useEffect, useRef, useState } from "react";
import { publicEnv } from "@/lib/env";
import { loadGoogleMaps, onMapsAuthFailure } from "@/lib/google-maps-loader";
import type { TripMapData } from "@/lib/trip-map";

type Status = "idle" | "loading" | "ready" | "failed";

// Draws the trip on a Google map: a purple line, and a dot at every stop.
async function drawRoute(
  element: HTMLElement,
  data: TripMapData,
): Promise<void> {
  const {
    Map: GoogleMap,
    Polyline,
    Circle,
  } = await google.maps.importLibrary("maps");
  const { LatLngBounds } = await google.maps.importLibrary("core");

  const map = new GoogleMap(element, {
    center: data.path[0],
    zoom: 14,
    disableDefaultUI: true, // switch off every button, then bring back only the zoom control
    zoomControl: true,
    gestureHandling: "cooperative", // one finger scrolls the page, two fingers move the map
    clickableIcons: false, // no pop-ups for shops and landmarks
  });

  new Polyline({
    map,
    path: data.path,
    strokeColor: "#5B2BD6",
    strokeOpacity: 0.9,
    strokeWeight: 5,
  });

  const bounds = new LatLngBounds();
  for (const stop of data.stops) {
    new Circle({
      map,
      center: stop,
      radius: 35,
      strokeColor: "#5B2BD6",
      strokeWeight: 3,
      fillColor: "#FFFFFF",
      fillOpacity: 1,
    });
    bounds.extend(stop);
  }
  map.fitBounds(bounds, 40);
}

// A map of one trip. Nothing is sent to Google until the person asks to see the map.
export function RouteMap({ data }: { data: TripMapData }) {
  const apiKey = publicEnv.googleMapsApiKey;
  const container = useRef<HTMLDivElement>(null);
  const [requested, setRequested] = useState(false);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (!requested || !apiKey) return undefined;

    let cancelled = false;
    const stopListening = onMapsAuthFailure(() => {
      if (!cancelled) setStatus("failed");
    });

    loadGoogleMaps(apiKey)
      .then(() =>
        container.current ? drawRoute(container.current, data) : undefined,
      )
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, [requested, apiKey, data]);

  return (
    <section
      aria-labelledby="map-heading"
      className="rounded-card border border-line-mid p-4"
    >
      <h2 id="map-heading" className="text-xs font-bold text-primary-deep">
        MAP
      </h2>

      {!apiKey && (
        <p className="mt-1 text-[13px] text-muted">
          The map is not available right now.
        </p>
      )}

      {apiKey && !requested && (
        <button
          type="button"
          onClick={() => {
            setRequested(true);
            setStatus("loading");
          }}
          className="mt-2 flex min-h-11 w-full items-center justify-center rounded-field bg-primary-light text-sm font-bold text-primary"
        >
          Show map
        </button>
      )}

      {apiKey && requested && (
        <div
          ref={container}
          role="region"
          aria-label="Map of the trip"
          className="mt-3 h-64 w-full overflow-hidden rounded-chip bg-primary-light"
        />
      )}

      {status === "loading" && (
        <p role="status" className="mt-2 text-[13px] text-muted">
          Loading the map...
        </p>
      )}
      {status === "failed" && (
        <p role="alert" className="mt-2 text-[13px] text-muted">
          The map could not load. The list below still shows the way.
        </p>
      )}

      <ol className="mt-3 flex list-decimal flex-col gap-1 pl-5 text-[13px] font-semibold">
        {data.stops.map((stop, index) => (
          <li key={`${index}-${stop.label}`}>{stop.label}</li>
        ))}
      </ol>

      <p className="mt-2 text-[13px] leading-normal text-muted">
        Straight lines between stops, not the exact road. Showing the map
        contacts Google.
      </p>
    </section>
  );
}
