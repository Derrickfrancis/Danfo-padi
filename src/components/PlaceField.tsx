"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  MIN_QUERY_CHARS,
  usePlaceSuggestions,
} from "@/hooks/usePlaceSuggestions";
import type { PlaceMatch } from "@/lib/places";
import type { FetchPlacesFailure } from "@/lib/places-client";

// What to tell the person when suggestions cannot be loaded.
const FAILURE_MESSAGES: Record<FetchPlacesFailure, string> = {
  aborted: "",
  network: "No connection. Check your data and try again.",
  rate_limited: "Too many searches. Wait a moment and try again.",
  bad_request: "That search was not understood. Try fewer letters.",
  server_error: "Suggestions are not available right now.",
  bad_response: "Suggestions are not available right now.",
};

type PlaceFieldProps = {
  label: string; // the name screen readers announce
  placeholder: string;
  icon: ReactNode;
  text: string; // what is typed in the box
  isChosen: boolean; // true once a suggestion has been picked
  onTextChange: (text: string) => void;
  onPick: (place: PlaceMatch) => void;
  trailing?: ReactNode; // for example the "use my location" button
};

const rowClass =
  "flex items-center gap-3 rounded-chip text-primary focus-within:outline-3 focus-within:-outline-offset-2 focus-within:outline-glow";
const inputClass =
  "h-12 w-full min-w-0 flex-1 border-0 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:font-semibold placeholder:text-muted";

// A text box that suggests places as you type. Works with mouse, touch and keyboard.
export function PlaceField({
  label,
  placeholder,
  icon,
  text,
  isChosen,
  onTextChange,
  onPick,
  trailing,
}: PlaceFieldProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1); // which suggestion the arrow keys are on

  // Once a place is picked we stop asking for suggestions.
  const { places, loading, failure } = usePlaceSuggestions(
    isChosen ? "" : text,
  );

  const wanted = !isChosen && text.trim().length >= MIN_QUERY_CHARS;
  const showList = open && wanted;
  // The list can change under the arrow keys, so only use the position if it still exists.
  const activeIndex = active >= 0 && active < places.length ? active : -1;

  function pick(place: PlaceMatch) {
    onPick(place);
    setOpen(false);
    setActive(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown" && wanted && !open) {
      setOpen(true);
      return;
    }
    if (!showList || places.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(activeIndex + 1 >= places.length ? 0 : activeIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(activeIndex <= 0 ? places.length - 1 : activeIndex - 1);
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault(); // choose the suggestion instead of submitting the form
      pick(places[activeIndex]);
    }
  }

  const emptyMessage = failure
    ? FAILURE_MESSAGES[failure]
    : loading
      ? "Looking for places..."
      : "No match yet. We only know a few stops so far.";

  return (
    <div className="relative">
      <div className={rowClass}>
        {icon}
        <input
          className={inputClass}
          role="combobox"
          aria-label={label}
          aria-expanded={showList}
          aria-controls={showList ? listId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          placeholder={placeholder}
          value={text}
          autoComplete="off"
          onChange={(e) => {
            onTextChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
        />
        {trailing}
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-auto rounded-card border border-line-mid bg-white py-1 text-ink shadow-xl"
        >
          {places.map((place, index) => (
            <li
              key={place.id}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={`flex min-h-11 cursor-pointer flex-col justify-center px-4 py-1.5 ${
                index === activeIndex ? "bg-primary-light" : ""
              }`}
              // Pressing a suggestion must not take focus from the box, or the list would close first.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(place)}
            >
              <span className="text-[15px] font-semibold">{place.name}</span>
              <span className="text-xs text-muted">{place.area}</span>
            </li>
          ))}
          {places.length === 0 && (
            <li role="presentation" className="px-4 py-3 text-sm text-muted">
              {emptyMessage}
            </li>
          )}
        </ul>
      )}

      {/* Read out by screen readers when the number of suggestions changes. */}
      <span role="status" className="sr-only">
        {showList && !loading && !failure
          ? `${places.length} suggestions available`
          : ""}
      </span>
    </div>
  );
}
