"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/home", label: "Home" },
  { href: "/add-route", label: "Add route" },
  { href: "/saved", label: "Saved" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="mt-auto flex justify-between border-t border-line-soft px-10 pt-3 pb-safe">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center justify-center text-xs ${
              active ? "font-bold text-primary" : "font-semibold text-muted"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
