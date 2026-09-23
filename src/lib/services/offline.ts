/**
 * Offline caching of the app shell (HTML, JS, CSS) via the service worker in /public/sw.js.
 *
 * The diary itself lives in IndexedDB and works offline regardless of this setting; this only
 * controls whether the *app code* is cached. It is a user preference because a stale cached
 * bundle is the most common cause of "the app is behaving strangely after an update".
 */

const KEY = "nutri-os:offline";
const SW_URL = "/sw.js";

/** Defaults to on. Storage can be unavailable (private mode, blocked site data). */
export function isOfflineEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export async function setOfflineEnabled(enabled: boolean): Promise<void> {
  try {
    localStorage.setItem(KEY, enabled ? "on" : "off");
  } catch {
    /* preference simply won't persist */
  }
  if (enabled) await registerServiceWorker();
  else await unregisterEverything();
}

export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_URL);
  } catch {
    /* offline caching is a bonus, not a requirement */
  }
}

/** Removes every service worker registration and every Cache Storage entry for this origin. */
export async function unregisterEverything(): Promise<void> {
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
