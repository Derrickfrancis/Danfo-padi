import { describe, expect, it } from "vitest";
import routesJson from "../data/routes.json";
import routeStopsJson from "../data/route-stops.json";
import segmentsJson from "../data/segments.json";
import stopsJson from "../data/stops.json";
import { checkNetwork } from "./network-checks";

// This checks the REAL data files in src/data, the ones the app uses.
// Run it on its own after editing them with:  npm run check-data
describe("the route data files", () => {
  it("have no problems", () => {
    const today = new Date().toISOString().slice(0, 10);
    const { problems } = checkNetwork(
      {
        stops: stopsJson,
        routes: routesJson,
        route_stops: routeStopsJson,
        segments: segmentsJson,
      },
      { today },
    );
    // If this fails, the list below says exactly what to fix, and where.
    expect(problems).toEqual([]);
  });
});
