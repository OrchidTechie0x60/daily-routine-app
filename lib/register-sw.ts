/**
 * Service Worker Registration
 * Skipped on native Capacitor (Android/iOS) — the OS handles notifications there.
 * Runs on web in production or local dev environments.
 */

function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  )
}

export async function registerServiceWorker() {
  // No service worker needed in native Capacitor apps
  if (isNative()) {
    console.log("[SW] Skipping registration — native Capacitor environment")
    return null
  }

  if (!("serviceWorker" in navigator)) {
    console.log("[SW] Service workers not supported")
    return null
  }

  // Skip in v0/preview environments
  if (typeof window !== "undefined" && window.location.hostname.includes("vusercontent.net")) {
    console.log("[SW] Skipping registration in preview environment")
    return null
  }

  const isProduction = process.env.NODE_ENV === "production"
  const isDevelopment =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

  if (!isProduction && !isDevelopment) {
    console.log("[SW] Skipping registration — not in production or local dev")
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    })

    console.log("[SW] Registration successful:", registration.scope)

    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing
      if (newWorker) {
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            console.log("[SW] New version available")
          }
        })
      }
    })

    return registration
  } catch (error) {
    console.log(
      "[SW] Registration skipped or failed (expected in preview):",
      error instanceof Error ? error.message : error,
    )
    return null
  }
}

export async function unregisterServiceWorker() {
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      console.log("[SW] Unregistered")
    }
  }
}
