import type { ReactNode } from "react";
import type { TripOption } from "@/lib/search";
import {
  buildTripRows,
  confidenceLabel,
  formatMinutes,
  formatNaira,
  isEstimate,
} from "@/lib/trip-format";
import { CheckCircleIcon } from "./Icons";

const BADGE_LABELS = { cheapest: "CHEAPEST", fastest: "FASTEST" } as const;

type TripCardProps = {
  trip: TripOption;
  title: string; // for example "Via Mushin"
  highlighted: boolean; // outlined, like the top card on the Cheapest and Fastest tabs
};

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-pill bg-primary px-2.5 py-1 text-[11px] font-extrabold text-white">
      {children}
    </span>
  );
}

// One way of making the trip, with its fare, time, and every leg.
export function TripCard({ trip, title, highlighted }: TripCardProps) {
  const { summary } = trip;
  const rows = buildTripRows(trip);
  const verified =
    summary.confidence === "medium" || summary.confidence === "high";

  return (
    <article
      className={`rounded-card bg-white p-4 ${highlighted ? "border-2 border-primary" : "border border-line-mid"}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-primary-deep">{title}</h2>
        <div className="flex flex-wrap justify-end gap-1.5">
          {trip.isBest && <Badge>BEST MATCH</Badge>}
          {trip.badges.map((badge) => (
            <Badge key={badge}>{BADGE_LABELS[badge]}</Badge>
          ))}
        </div>
      </div>

      <p className="mt-2 text-[28px] leading-none font-extrabold text-primary">
        {formatNaira(summary.fareMin, summary.fareMax)}
        {isEstimate(trip.journey.legs) ? " est." : ""}
      </p>
      <p className="mt-1.5 text-sm font-bold">
        {formatMinutes(summary.timeMin, summary.timeMax)}
      </p>
      <p className="mt-1 text-[13px] text-muted">{trip.reason}</p>

      <p
        className={`mt-2 flex items-center gap-1.5 text-[13px] font-semibold ${verified ? "text-primary" : "text-muted"}`}
      >
        {verified && <CheckCircleIcon size={16} />}
        {confidenceLabel(summary.confidence)}
      </p>

      <ul className="mt-3 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key} className="flex items-start gap-3">
            <span className="mt-0.5 rounded-md bg-primary px-2 py-0.5 text-[11px] font-extrabold text-white">
              {row.tag}
            </span>
            <div>
              <p className="text-[15px] leading-snug font-semibold">
                {row.text}
              </p>
              <p className="text-[13px] text-muted">{row.fare}</p>
            </div>
          </li>
        ))}
      </ul>

      {/* These two buttons are built in the next pieces. They are switched off until then. */}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          disabled
          title="Coming soon"
          className="min-h-11 flex-1 rounded-field bg-primary-light text-sm font-bold text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Fare breakdown
        </button>
        <button
          type="button"
          disabled
          title="Coming soon"
          className="min-h-11 flex-1 rounded-field bg-primary text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Start
        </button>
      </div>
    </article>
  );
}
