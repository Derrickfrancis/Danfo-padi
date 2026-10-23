import type { Segment } from "./domain";

// A lookup table: give it a stop's id, get every leg that leaves from that stop.
export type Graph = ReadonlyMap<string, readonly Segment[]>;

// Builds the lookup from a list of segments.
export function buildGraph(segments: readonly Segment[]): Graph {
  const outgoing = new Map<string, Segment[]>();

  for (const segment of segments) {
    const list = outgoing.get(segment.from_stop_id);
    if (list) {
      list.push(segment);
    } else {
      outgoing.set(segment.from_stop_id, [segment]);
    }
  }

  // Same order every time, so results never change between runs.
  for (const list of outgoing.values()) {
    list.sort((a, b) => a.id.localeCompare(b.id));
  }

  return outgoing;
}

const NO_LEGS: readonly Segment[] = [];

// The legs that leave from a stop. An unknown stop simply has none.
export function legsFrom(graph: Graph, stopId: string): readonly Segment[] {
  return graph.get(stopId) ?? NO_LEGS;
}
