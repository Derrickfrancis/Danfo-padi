export type LangCode = "en" | "pcm" | "yo" | "ha" | "ig";

export const LANGUAGES: { code: LangCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "pcm", label: "Pidgin" },
  { code: "yo", label: "Yorùbá" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
];

// Copy for the Welcome screen. Only this screen is translated so far.
export const WELCOME: Record<LangCode, { greet: string; tagline: string; cta: string }> = {
  en: {
    greet: "Welcome",
    tagline: "Know which bus or keke to take, how much to pay, and how to get there.",
    cta: "Get started",
  },
  pcm: {
    greet: "How far, padi?",
    tagline: "Know which bus or keke to enter, how much to pay, and how to reach.",
    cta: "Make we start",
  },
  yo: {
    greet: "Ẹ káàbọ̀",
    tagline: "Mọ ọkọ̀ tí o máa wọ̀, owó tí o máa san, àti bí o ṣe máa dé.",
    cta: "Bẹ̀rẹ̀",
  },
  ha: {
    greet: "Barka da zuwa",
    tagline: "Ka san wace mota ko keke za ka hau, nawa za ka biya, da yadda za ka isa.",
    cta: "Fara",
  },
  ig: {
    greet: "Nnọọ",
    tagline: "Mara ụgbọ ala ma ọ bụ keke ị ga-abanye, ego ị ga-akwụ, na ka ị ga-esi ruo.",
    cta: "Malite",
  },
};

export const STATES: { value: string; label: string; enabled: boolean }[] = [
  { value: "lagos", label: "Lagos", enabled: true },
  { value: "abuja", label: "Abuja (FCT) · coming soon", enabled: false },
  { value: "ogun", label: "Ogun · coming soon", enabled: false },
  { value: "oyo", label: "Oyo · coming soon", enabled: false },
  { value: "rivers", label: "Rivers · coming soon", enabled: false },
  { value: "kano", label: "Kano · coming soon", enabled: false },
  { value: "enugu", label: "Enugu · coming soon", enabled: false },
];

export const LANG_STORAGE_KEY = "dp.lang";
