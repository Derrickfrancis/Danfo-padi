import Link from "next/link";
import type { Point } from "@/lib/geo";
import type { SortMode } from "@/lib/ranking";
import { buildRoutesHref } from "@/lib/routes-query";

// The three tabs on the Routes screen. They are the same trips in a different order.
const TABS: { sort: SortMode; label: string }[] = [
  { sort: "best", label: "All routes" },
  { sort: "cheapest", label: "Cheapest" },
  { sort: "fastest", label: "Fastest" },
];

type RouteTabsProps = {
  active: SortMode;
  origin: Point;
  destination: Point;
};

export function RouteTabs({ active, origin, destination }: RouteTabsProps) {
  return (
    <nav aria-label="Sort routes" className="flex gap-2 px-6">
      {TABS.map((tab) => {
        const isActive = tab.sort === active;
        return (
          <Link
            key={tab.sort}
            href={buildRoutesHref(origin, destination, tab.sort)}
            // Each tab is a new search on the server, so do not run it just because it is visible.
            prefetch={false}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-11 items-center rounded-pill px-4 text-sm font-bold ${
              isActive
                ? "bg-primary text-white"
                : "bg-primary-light text-primary-deep"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
