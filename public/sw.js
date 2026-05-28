/**
 * Service Worker for PWA Support
 * Handles offline caching and notification display
 */

const CACHE_NAME = "routine-scheduler-v1"
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192x192.jpg", "/icon-512x512.jpg"]

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Caching static assets")
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(event.request).then((response) => {
          // Cache successful requests
          if (response.status === 200) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return response
        })
      })
      .catch(() => {
        // Return a basic offline page for navigation requests
        if (event.request.mode === "navigate") {
          return caches.match("/")
        }
      }),
  )
})

// Notification click handler
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event.notification.tag)
  event.notification.close()

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if found
      for (const client of clientList) {
        if (client.url === self.registration.scope && "focus" in client) {
          return client.focus()
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow("/")
      }
    }),
  )
})

// Push notification handler (for future extension)
self.addEventListener("push", (event) => {
  console.log("[SW] Push received")

  const data = event.data ? event.data.json() : {}
  const title = data.title || "Activity Reminder"
  const options = {
    body: data.body || "Time for your scheduled activity",
    icon: "/icon-192x192.jpg",
    badge: "/icon-192x192.jpg",
    tag: data.tag || "activity-notification",
    requireInteraction: false,
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-notifications") {
    event.waitUntil(checkMissedNotifications())
  }
})

async function checkMissedNotifications() {
  console.log("[SW] Checking for missed notifications")

  // Open IndexedDB and check scheduled notifications
  const db = await openDatabase()
  const pending = await getAllScheduledNotifications(db)
  const now = Date.now()

  for (const notif of pending) {
    if (notif.scheduledTime <= now) {
      await self.registration.showNotification(notif.title, {
        body: notif.body,
        icon: "/icon-192x192.jpg",
        badge: "/icon-192x192.jpg",
        tag: notif.tag,
        requireInteraction: true,
        vibrate: [200, 100, 200],
        silent: false,
      })
      await deleteNotification(db, notif.id)
    }
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("routine-scheduler-db", 2)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function getAllScheduledNotifications(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["scheduled-notifications"], "readonly")
    const store = transaction.objectStore("scheduled-notifications")
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

function deleteNotification(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["scheduled-notifications"], "readwrite")
    const store = transaction.objectStore("scheduled-notifications")
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}
