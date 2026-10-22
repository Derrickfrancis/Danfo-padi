"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { GlobeIcon, PinIcon } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import { SelectField } from "@/components/SelectField";
import { LANGUAGES, LANG_STORAGE_KEY, STATES, WELCOME, type LangCode } from "@/lib/i18n";
import { primaryButtonLarge } from "@/lib/ui";

export default function WelcomePage() {
  const [lang, setLang] = useState<LangCode>("en");
  const [state, setState] = useState("lagos");

  // Remember the language between visits.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as LangCode | null;
      if (saved && saved in WELCOME) setLang(saved);
    } catch {
      /* storage unavailable: keep default */
    }
  }, []);

  function onLangChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as LangCode;
    setLang(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const copy = WELCOME[lang];

  return (
    <AppShell>
      <div className="relative h-[340px] flex-none bg-primary">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 390 340" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <circle cx="350" cy="40" r="96" fill="#7A4DF0" opacity=".55" />
          <circle cx="20" cy="310" r="80" fill="#7A4DF0" opacity=".45" />
          <circle cx="60" cy="70" r="26" fill="#fff" opacity=".12" />
          <path
            d="M-10 285C80 215 150 320 225 262S345 200 400 240"
            fill="none"
            stroke="#fff"
            strokeOpacity=".4"
            strokeWidth="4"
            strokeDasharray="2 11"
            strokeLinecap="round"
          />
          <circle cx="82" cy="262" r="6" fill="#fff" opacity=".7" />
          <circle cx="225" cy="262" r="6" fill="#fff" opacity=".7" />
          <circle cx="352" cy="226" r="9" fill="#fff" />
          <circle cx="352" cy="226" r="3.5" fill="#5B2BD6" />
        </svg>
        <div className="relative flex flex-col items-center gap-3.5 pt-safe-hero">
          <div className="flex h-[116px] w-[116px] items-center justify-center rounded-[34px] bg-white shadow-[0_12px_28px_rgba(30,10,90,0.35)]">
            <Logo />
          </div>
          <p className="text-[34px] font-extrabold tracking-tight text-white">Danfo Padi</p>
        </div>
      </div>

      <div className="relative -mt-8 flex flex-1 flex-col gap-[18px] rounded-t-sheet bg-white px-6 pt-8 pb-safe">
        <div>
          <h1 className="text-[26px] font-extrabold">{copy.greet}</h1>
          <p className="mt-1.5 text-[15px] leading-normal text-muted">{copy.tagline}</p>
        </div>

        <SelectField id="language" label="Language" icon={<GlobeIcon />} value={lang} onChange={onLangChange}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </SelectField>

        <SelectField id="state" label="State" icon={<PinIcon />} value={state} onChange={(e) => setState(e.target.value)}>
          {STATES.map((s) => (
            <option key={s.value} value={s.value} disabled={!s.enabled}>
              {s.label}
            </option>
          ))}
        </SelectField>

        <Link href="/home" className={`${primaryButtonLarge} mt-auto`}>
          {copy.cta}
        </Link>
      </div>
    </AppShell>
  );
}
