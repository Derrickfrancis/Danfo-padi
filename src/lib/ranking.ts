import type { Journey } from "./journeys";
import { summarizeJourney, type JourneySummary } from "./summary";

export type Badge = "cheapest" | "fastest";

// The three tabs on the Routes screen: All routes, Cheapest, Fastest.
export type SortMode = "best" | "cheapest" | "fastest";

export type RankedJourney = {
  journey: Journey;
  summary: JourneySummary;
  score: number; // 0 is best, 1 is worst
  badges: Badge[];
  isBest: boolean;
  reason: string; // one plain-language line for the route card
};

// How much each thing matters when picking the best journey. They add up to 1.
// ASSUMPTION: these are starting values. We can tune them once real riders react.
export const SCORE_WEIGHTS = { time: 0.4, cost: 0.4, transfers: 0.2 } as const;

// The middle of the low-to-high range, used for comparing journeys.
export function averageTime(summary: JourneySummary): number {
  return (summary.timeMin + summary.timeMax) / 2;
}

export function averageFare(summary: JourneySummary): number {
  return (summary.fareMin + summary.fareMax) / 2;
}

/* ---------- Ordering ---------- */

type Sortable = Pick<RankedJourney, "journey" | "summary" | "score">;

// Each of these says which of two journeys comes first. A negative number
// means "a first". The "||" means: if that comparison is a tie (zero),
// try the next one. The last step, the id, makes every tie break the same way.
function compareBest(a: Sortable, b: Sortable): number {
  return (
    a.score - b.score ||
    averageFare(a.summary) - averageFare(b.summary) ||
    averageTime(a.summary) - averageTime(b.summary) ||
    a.journey.id.localeCompare(b.journey.id)
  );
}

function compareCheapest(a: Sortable, b: Sortable): number {
  return (
    averageFare(a.summary) - averageFare(b.summary) ||
    averageTime(a.summary) - averageTime(b.summary) ||
    a.journey.id.localeCompare(b.journey.id)
  );
}

function compareFastest(a: Sortable, b: Sortable): number {
  return (
    averageTime(a.summary) - averageTime(b.summary) ||
    averageFare(a.summary) - averageFare(b.summary) ||
    a.journey.id.localeCompare(b.journey.id)
  );
}

/* ---------- Scoring ---------- */

// Turns a list of numbers into 0 to 1, where 0 is the lowest and 1 the highest.
// If they are all the same, everything is 0 (nothing to choose between).
function normalize(values: number[]): number[] {
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return values.map(() => 0);
  return values.map((value) => (value - low) / (high - low));
}

// Rounds to 4 decimal places so tiny computer rounding errors cannot break a tie.
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/* ---------- The reason line ---------- */

function describeTransfers(count: number): string {
  if (count === 0) return "no transfer";
  if (count === 1) return "one transfer";
  return `${count} transfers`;
}

// Built from fixed wording and numbers only. No user text goes in here.
function buildReason(
  summary: JourneySummary,
  best: JourneySummary,
  isCheapest: boolean,
  isFastest: boolean,
  onlyOne: boolean,
): string {
  const transfers = describeTransfers(summary.transfers);
  if (onlyOne) return `Only route found, with ${transfers}`;
  if (isCheapest && isFastest) return `Cheapest and fastest, with ${transfers}`;
  if (isCheapest) return `Cheapest, with ${transfers}`;
  if (isFastest) return `Fastest, with ${transfers}`;
  if (summary.transfers < best.transfers)
    return `Fewer transfers than the best match (${transfers})`;
  return `A balance of cost and time, with ${transfers}`;
}

/* ---------- What the rest of the app uses ---------- */

// Scores every journey and returns them best first.
export function rankJourneys(journeys: readonly Journey[]): RankedJourney[] {
  if (journeys.length === 0) return [];

  const summaries = journeys.map((journey) => summarizeJourney(journey));
  const timeScores = normalize(summaries.map(averageTime));
  const fareScores = normalize(summaries.map(averageFare));
  const transferScores = normalize(summaries.map((s) => s.transfers));

  const scored: Sortable[] = journeys
    .map((journey, i) => ({
      journey,
      summary: summaries[i],
      score: round4(
        SCORE_WEIGHTS.time * timeScores[i] +
          SCORE_WEIGHTS.cost * fareScores[i] +
          SCORE_WEIGHTS.transfers * transferScores[i],
      ),
    }))
    .sort(compareBest);

  const fares = scored.map((item) => averageFare(item.summary));
  const times = scored.map((item) => averageTime(item.summary));
  const lowestFare = Math.min(...fares);
  const highestFare = Math.max(...fares);
  const lowestTime = Math.min(...times);
  const highestTime = Math.max(...times);
  const onlyOne = scored.length === 1;
  const best = scored[0];

  return scored.map((item, index) => {
    const fare = averageFare(item.summary);
    const time = averageTime(item.summary);
    // A badge only means something when there is a real difference to point at.
    const isCheapest =
      !onlyOne && fare === lowestFare && lowestFare < highestFare;
    const isFastest =
      !onlyOne && time === lowestTime && lowestTime < highestTime;

    const badges: Badge[] = [];
    if (isCheapest) badges.push("cheapest");
    if (isFastest) badges.push("fastest");

    return {
      ...item,
      badges,
      isBest: index === 0,
      reason: buildReason(
        item.summary,
        best.summary,
        isCheapest,
        isFastest,
        onlyOne,
      ),
    };
  });
}

// The same journeys in the order a tab asks for. The original list is left alone.
export function sortJourneys<T extends RankedJourney>(
  ranked: readonly T[],
  mode: SortMode,
): T[] {
  const copy = [...ranked];
  if (mode === "cheapest") return copy.sort(compareCheapest);
  if (mode === "fastest") return copy.sort(compareFastest);
  return copy.sort(compareBest);
}
