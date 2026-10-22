import Link from "next/link";
import { AppShell } from "./AppShell";
import { ChevronLeftIcon } from "./Icons";
import { iconButton } from "@/lib/ui";

// Temporary screen for routes we have not built yet.
export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <AppShell>
      <header className="flex items-center gap-3 px-6 pt-safe pb-4">
        <Link href="/home" className={iconButton} aria-label="Back to home">
          <ChevronLeftIcon />
        </Link>
        <div>
          <h1 className="text-lg font-extrabold">{title}</h1>
          <p className="text-[13px] text-muted">Not built yet · planned for {phase}</p>
        </div>
      </header>
    </AppShell>
  );
}
