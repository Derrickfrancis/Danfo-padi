"use client";

import { useSyncExternalStore } from "react";

const doNothing = () => () => {};

// False while the server builds the page, true once the page is running on the phone.
// It lets a screen avoid showing "nothing saved" for a moment before it has looked.
export function useHydrated(): boolean {
  return useSyncExternalStore(
    doNothing,
    () => true,
    () => false,
  );
}
