/**
 * docs/10-implementation-plan.md task 6.7. Registers `/sw.js`, which the
 * production export generates (scripts/build-pwa.ts). Not in development:
 * the dev server has no `sw.js`, and a worker caching Metro's bundles
 * would serve stale code across reloads.
 *
 * After the page's `load` event, so installing the worker (which fetches
 * the whole app shell) never competes with the first paint.
 */
export function registerServiceWorker(): void {
  if (__DEV__ || typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
  const register = () => {
    // updateViaCache "none": the update check always reaches the host, so
    // a long cache header on sw.js can't pin visitors to an old deploy.
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
      // No worker (a preview host without sw.js, a privacy mode that blocks
      // it): the site works exactly as before, just not offline.
    })
  }
  if (document.readyState === "complete") register()
  else window.addEventListener("load", register, { once: true })
}
