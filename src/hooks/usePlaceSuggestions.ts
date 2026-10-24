"use client";

import { useEffect, useState } from "react";
import type { PlaceMatch } from "@/lib/places";
import { MAX_PLACES_QUERY_CHARS } from "@/lib/places-api";
import type {
  FetchPlacesFailure,
  FetchPlacesResult,
} from "@/lib/places-client";
import { scheduleLookup } from "@/lib/places-lookup";

// Same minimum as the server's search: one letter would match too much to help.
export const MIN_QUERY_CHARS = 2;

// An answer, remembered together with the text it was asked for.
type Answer = {
  query: string;
  places: PlaceMatch[];
  failure: FetchPlacesFailure | null;
};

export type PlaceSuggestions = {
  places: PlaceMatch[];
  loading: boolean;
  failure: FetchPlacesFailure | null;
};

function toAnswer(query: string, result: FetchPlacesResult): Answer {
  if (result.ok) return { query, places: result.places, failure: null };
  return { query, places: [], failure: result.reason };
}

// Gives suggestions for the text someone is typing.
export function usePlaceSuggestions(text: string): PlaceSuggestions {
  const query = text.trim().slice(0, MAX_PLACES_QUERY_CHARS);
  const wanted = query.length >= MIN_QUERY_CHARS;
  const [answer, setAnswer] = useState<Answer | null>(null);

  useEffect(() => {
    if (!wanted) return undefined;
    // State is only set later, when the answer arrives, never during the effect itself.
    // The returned function runs when the text changes again, and cancels the old lookup.
    return scheduleLookup(query, {
      onResult: (result) => setAnswer(toAnswer(query, result)),
    });
  }, [query, wanted]);

  // Use an answer only if it was asked for the text as it is right now.
  const current =
    wanted && answer !== null && answer.query === query ? answer : null;

  return {
    places: current?.places ?? [],
    failure: current?.failure ?? null,
    loading: wanted && current === null,
  };
}
