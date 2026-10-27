import type { TripOption } from "@/lib/search";
import { BOARDING_WAIT_MINUTES } from "@/lib/summary";
import {
  buildTripRows,
  confidenceLabel,
  describeEnd,
  describeStart,
  formatMinutes,
  formatNaira,
  isEstimate,
} from "@/lib/trip-format";
import { primaryButton } from "@/lib/ui";
import { CheckCircleIcon } from "./Icons";
import { SaveTripButton } from "./SavedTripsButton";

const secondaryButton =
  "flex min-h-11 w-full items-center justify-center rounded-field border border-line-mid bg-white text-sm font-bold text-primary disabled:cursor-not-allowed disabled:opacity-50";

type FareBreakdownProps = {
  trip: TripOption;
  // What we keep if the person saves this trip: where to open it again, and two lines for the list.
  save: { href: string; title: string; via: string };
};

// Every part of one trip, with what each part costs and the total.
export function FareBreakdown({ trip, save }: FareBreakdownProps) {
  const { summary } = trip;
  const rows = buildTripRows(trip);
  const verified =
    summary.confidence === "medium" || summary.confidence === "high";

  return (
    <div className="flex flex-col gap-4 px-6 pb-safe">
      <section className="rounded-card bg-primary-light p-4">
        <p className="text-xs font-bold text-primary-deep">START</p>
        <p className="mt-1 text-[15px] font-semibold">
          {describeStart(trip.access)}
        </p>
      </section>

      <section aria-labelledby="fare-parts">
        <h2 id="fare-parts" className="sr-only">
          What each part of the trip costs
        </h2>
        <ul>
          {rows.map((row) => (
            <li
              key={row.key}
              className="flex items-start justify-between gap-3 border-b border-line-soft py-3"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 rounded-md bg-primary px-2 py-0.5 text-[11px] font-extrabold text-white">
                  {row.tag}
                </span>
                <p className="text-[15px] leading-snug font-semibold">
                  {row.text}
                </p>
              </div>
              <p className="flex-none text-[15px] font-bold">
                {row.tag === "WALK" ? "Free" : row.fare}
              </p>
            </li>
          ))}
        </ul>

        <div className="flex items-baseline justify-between pt-4">
          <span className="text-base font-extrabold">Total</span>
          <span className="text-2xl font-extrabold text-primary">
            {formatNaira(summary.fareMin, summary.fareMax)}
            {isEstimate(trip.journey.legs) ? " est." : ""}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-muted">
          {`Travel time ${formatMinutes(summary.timeMin, summary.timeMax)}, including an estimated ${BOARDING_WAIT_MINUTES.min}–${BOARDING_WAIT_MINUTES.max} minutes waiting for each vehicle.`}
        </p>
      </section>

      <section className="rounded-card bg-primary-light p-4">
        <p
          className={`flex items-center gap-1.5 text-sm font-bold ${verified ? "text-primary" : "text-primary-deep"}`}
        >
          {verified && <CheckCircleIcon size={18} />}
          {confidenceLabel(summary.confidence)}
        </p>
        <p className="mt-1 text-[13px] leading-normal text-muted">
          Danfo and keke fares are often negotiated, so the price you pay can
          differ from this range.
        </p>
      </section>

      <section className="rounded-card border border-line-mid p-4">
        <p className="text-xs font-bold text-primary-deep">END</p>
        <p className="mt-1 text-[15px] font-semibold">
          {describeEnd(trip.egress)}
        </p>
      </section>

      {/* The first two are built in later pieces. They are switched off until then. */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled
          title="Coming soon"
          className={primaryButton}
        >
          Start navigation
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className={secondaryButton}
        >
          Report a wrong fare
        </button>
        <SaveTripButton
          trip={{
            href: save.href,
            title: save.title,
            via: save.via,
            fareMin: summary.fareMin,
            fareMax: summary.fareMax,
            estimate: isEstimate(trip.journey.legs),
          }}
        />
      </div>
    </div>
  );
}
