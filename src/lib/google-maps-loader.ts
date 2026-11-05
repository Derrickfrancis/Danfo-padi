// Loads Google's map code, once, and only when asked. Nothing contacts Google until then.

declare global {
  interface Window {
    // Google calls this by name if it rejects our key.
    gm_authFailure?: () => void;
  }
}

export class MapsLoadError extends Error {
  constructor(readonly reason: "network") {
    super(`Google Maps could not load: ${reason}`);
    this.name = "MapsLoadError";
  }
}

// The address of Google's loader, with our settings. "quarterly" is Google's steadier
// release channel, "async" loads without freezing the page, and the region favours Nigeria.
export function buildMapsScriptUrl(apiKey: string): string {
  const params = new URLSearchParams({
    key: apiKey,
    v: "quarterly",
    loading: "async",
    language: "en",
    region: "NG",
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

let loading: Promise<void> | null = null;
const authFailureListeners = new Set<() => void>();

// Tells you if Google rejects the key, for example because it is restricted to other websites.
export function onMapsAuthFailure(listener: () => void): () => void {
  authFailureListeners.add(listener);
  return () => {
    authFailureListeners.delete(listener);
  };
}

// Adds Google's script to the page the first time, and gives everyone the same answer after.
export function loadGoogleMaps(apiKey: string): Promise<void> {
  if (loading) return loading;

  loading = new Promise<void>((resolve, reject) => {
    window.gm_authFailure = () => {
      for (const listener of authFailureListeners) listener();
    };

    const script = document.createElement("script");
    script.src = buildMapsScriptUrl(apiKey);
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      loading = null; // so a later try can start again
      reject(new MapsLoadError("network"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

// For tests only: forget that the script was ever added.
export function resetMapsLoaderForTests(): void {
  loading = null;
  authFailureListeners.clear();
}
