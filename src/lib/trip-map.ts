import type { Stop } from "./domain";
import type { Point } from "./geo";
import type { TripOption } from "./search";

export type MapPoint = { lat: number; lng: number };
export type MapStop = MapPoint & { label: string };

// Everything the map needs, as plain numbers and words, so it can be sent to the phone.
export type TripMapData = {
  path: MapPoint[]; // the line to draw, in order
  stops: MapStop[]; // the dots, in order, with a name for each
};

// About two metres. Points closer than this are the same place.
const SAME_SPOT_DEGREES = 0.00002;

function sameSpot(a: MapPoint, b: MapPoint): boolean {
  return (
    Math.abs(a.lat - b.lat) < SAME_SPOT_DEGREES &&
    Math.abs(a.lng - b.lng) < SAME_SPOT_DEGREES
  );
}

// Works out what to draw for one trip: from where the person starts, through each stop
// on the way, to where they are going. The line is straight between stops, not the road.
export function buildTripMap(
  trip: Pick<TripOption, "journey" | "access">,
  stopById: (id: string) => Stop | undefined,
  origin: Point,
  destination: Point,
): TripMapData {
  const stops: MapStop[] = [
    { lat: origin.lat, lng: origin.lng, label: "Your start" },
  ];

  // Adds a place, or, if it is the very same spot as the last one, names that one instead.
  function add(point: MapPoint, label: string): void {
    const last = stops[stops.length - 1];
    if (last && sameSpot(last, point)) {
      stops[stops.length - 1] = { lat: last.lat, lng: last.lng, label };
    } else {
      stops.push({ lat: point.lat, lng: point.lng, label });
    }
  }

  const stopIds = [
    trip.access.stop.id,
    ...trip.journey.legs.map((leg) => leg.to_stop_id),
  ];
  for (const id of stopIds) {
    const stop = stopById(id);
    if (stop) add(stop, stop.name);
  }

  // The destination only gets its own dot if it is somewhere new.
  const last = stops[stops.length - 1];
  if (!sameSpot(last, destination)) {
    stops.push({
      lat: destination.lat,
      lng: destination.lng,
      label: "Your destination",
    });
  }

  return { path: stops.map(({ lat, lng }) => ({ lat, lng })), stops };
}
