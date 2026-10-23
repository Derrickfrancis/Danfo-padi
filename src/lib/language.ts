import { LANGUAGES, LANG_STORAGE_KEY, type LangCode } from "./i18n";

// Browsers tell us when another tab changes storage, but not when this tab
// does. So we announce our own changes with this event name.
const LANG_CHANGED = "dp:lang-changed";

// React calls this once. We return a function that undoes what we set up.
export function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(LANG_CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LANG_CHANGED, onChange);
  };
}

// The saved language in this browser, or English if there is none.
export function getLanguage(): LangCode {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    // Storage can be edited by the user, so only accept codes we offer.
    const match = LANGUAGES.find((l) => l.code === saved);
    if (match) return match.code;
  } catch {
    /* storage unavailable: use the default */
  }
  return "en";
}

// What the server uses while building the page. It cannot see the browser.
export function getServerLanguage(): LangCode {
  return "en";
}

export function saveLanguage(code: LangCode) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    /* ignore: the choice just won't be remembered */
  }
  window.dispatchEvent(new Event(LANG_CHANGED));
}
