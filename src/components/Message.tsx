import Link from "next/link";
import type { ReactNode } from "react";
import { iconButton, primaryButton } from "@/lib/ui";
import { AppShell } from "./AppShell";
import { ChevronLeftIcon } from "./Icons";

type MessageProps = {
  title: string;
  text: ReactNode;
  href?: string; // where the back arrow and the button go
  actionLabel?: string;
};

// A simple screen for when there is nothing to show: a bad link, too many tries, no routes.
export function Message({
  title,
  text,
  href = "/home",
  actionLabel = "Search again",
}: MessageProps) {
  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href={href} className={iconButton} aria-label="Go back">
          <ChevronLeftIcon />
        </Link>
        <h1 className="text-lg font-extrabold">{title}</h1>
      </header>
      <div className="flex flex-col gap-4 px-6">
        <p className="text-[15px] leading-normal text-muted">{text}</p>
        <Link href={href} className={primaryButton}>
          {actionLabel}
        </Link>
      </div>
    </AppShell>
  );
}
