import { fetchPlaces, type FetchPlacesResult } from "./places-client";

// How long to wait after the last keystroke before asking the server.
export const SUGGESTION_DELAY_MS = 250;

type Fetcher = (
  query: string,
  signal: AbortSignal,
) => Promise<FetchPlacesResult>;

export type LookupOptions = {
  onResult: (result: FetchPlacesResult) => void;
  delayMs?: number; // tests use a different wait
  fetcher?: Fetcher; // tests pass in a pretend one
};

// Waits a moment, then asks for suggestions. Returns a function that cancels
// everything: the wait, a request already on its way, and any answer still to come.
export function scheduleLookup(
  query: string,
  options: LookupOptions,
): () => void {
  const controller = new AbortController();
  const fetcher: Fetcher =
    options.fetcher ?? ((text, signal) => fetchPlaces(text, { signal }));

  const timer = setTimeout(async () => {
    let result: FetchPlacesResult;
    try {
      result = await fetcher(query, controller.signal);
    } catch {
      result = { ok: false, reason: "network" };
    }

    // Cancelled while we waited for the answer: it is about old text, so drop it.
    if (controller.signal.aborted) return;
    // Cancelling on purpose is not an error, so there is nothing to report.
    if (!result.ok && result.reason === "aborted") return;

    options.onResult(result);
  }, options.delayMs ?? SUGGESTION_DELAY_MS);

  return () => {
    clearTimeout(timer);
    controller.abort();
  };
}
