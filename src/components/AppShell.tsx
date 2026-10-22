import type { ReactNode } from "react";

// The phone-width frame every screen sits in. On a phone it fills the screen.
// On a larger screen it stays 430px wide and centred, with a soft edge.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-white min-[431px]:shadow-2xl min-[431px]:ring-1 min-[431px]:ring-line-mid">
      {children}
    </main>
  );
}
