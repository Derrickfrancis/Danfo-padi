import type { Segment } from "./domain";
import type { Journey } from "./journeys";

type Confidence = Segment["confidence"];

// ASSUMPTION, not surveyed: how long a rider waits to board each vehicle.
// Replace these two numbers with figures from the field survey.
export const BOARDING_WAIT_MINUTES = { min: 3, max: 10 } as const;

// Weakest first. A journey is only as trustworthy as its least certain leg.
const CONFIDENCE_ORDER: readonly Confidence[] = [
  "sample",
  "low",
  "medium",
  "high",
];

// The totals for one journey: what a route card shows.
export type JourneySummary = {
  journeyId: string;
  timeMin: number; // minutes, including waiting to board
  timeMax: number;
  fareMin: number; // naira
  fareMax: number;
  rides: number; // legs on a vehicle
  walks: number;
  transfers: number; // changes between vehicles
  confidence: Confidence; // the weakest leg
};

export function summarizeJourney(journey: Journey): JourneySummary {
  let timeMin = 0;
  let timeMax = 0;
  let fareMin = 0;
  let fareMax = 0;
  let rides = 0;
  let walks = 0;
  // Start at the top, then lower it whenever a leg is less certain.
  // A journey with no legs proves nothing, so it starts at the bottom.
  let weakest: Confidence = journey.legs.length > 0 ? "high" : "sample";

  for (const leg of journey.legs) {
    timeMin += leg.time_min;
    timeMax += leg.time_max;
    fareMin += leg.fare_min;
    fareMax += leg.fare_max;

    if (leg.mode === "walk") {
      walks += 1;
    } else {
      rides += 1;
      // Every vehicle has to be waited for.
      timeMin += BOARDING_WAIT_MINUTES.min;
      timeMax += BOARDING_WAIT_MINUTES.max;
    }

    if (
      CONFIDENCE_ORDER.indexOf(leg.confidence) <
      CONFIDENCE_ORDER.indexOf(weakest)
    ) {
      weakest = leg.confidence;
    }
  }

  return {
    journeyId: journey.id,
    timeMin,
    timeMax,
    fareMin,
    fareMax,
    rides,
    walks,
    transfers: Math.max(rides - 1, 0),
    confidence: weakest,
  };
}
