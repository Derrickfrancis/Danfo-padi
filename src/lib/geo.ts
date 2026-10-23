import type { Stop } from "./domain";

// A place on the map.
export type Point = { lat: number; lng: number };

// A stop near a person, with how far and how long to walk.
export type NearbyStop = { stop: Stop; meters: number; walkMinutes: number };

const EARTH_RADIUS_METERS = 6_371_000;
const WALKING_METERS_PER_MINUTE = 80; // about 4.8 km/h

// Roads bend, so the real walk is longer than a straight line.
const DETOUR_FACTOR = 1.3;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Straight-line distance between two points, in meters (the haversine formula).
export function distanceMeters(a: Point, b: Point): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Estimated walking time in whole minutes, rounded up.
export function walkingMinutes(meters: number): number {
  return Math.ceil((meters * DETOUR_FACTOR) / WALKING_METERS_PER_MINUTE);
}

// The stops within walking distance of a point, nearest first.
export function findNearbyStops(
  point: Point,
  stops: Stop[],
  maxMeters = 1000,
  limit = 5,
): NearbyStop[] {
  // Never trust coordinates: refuse anything that is not a real number.
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng)) return [];

  // Keep the settings inside sensible bounds.
  const safeMax = Math.min(Math.max(maxMeters, 0), 5000);
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 20);

  return stops
    .map((stop) => ({ stop, meters: Math.round(distanceMeters(point, stop)) }))
    .filter((item) => item.meters <= safeMax)
    .sort((a, b) => a.meters - b.meters)
    .slice(0, safeLimit)
    .map((item) => ({ ...item, walkMinutes: walkingMinutes(item.meters) }));
}
