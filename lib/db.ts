/**
 * IndexedDB wrapper for local-first data persistence
 * Handles all schedule and activity storage operations
 */

import type { Schedule } from "./types"

const DB_NAME = "routine-scheduler-db"
const DB_VERSION = 2 // Incremented version for new notification store
const STORE_NAME = "schedules"
const NOTIFICATIONS_STORE = "scheduled-notifications" // New store for scheduled notifications

let dbInstance: IDBDatabase | null = null

/**
 * Initialize and open IndexedDB connection
 */
export async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return dbInstance
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error("[DB] Failed to open database:", request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      dbInstance = request.result
      console.log("[DB] Database opened successfully")
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      console.log("[DB] Upgrading database schema")

      // Create schedules store
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id" })
        objectStore.createIndex("lastModified", "lastModified", { unique: false })
        console.log("[DB] Created schedules object store")
      }

      if (!db.objectStoreNames.contains(NOTIFICATIONS_STORE)) {
        const notifStore = db.createObjectStore(NOTIFICATIONS_STORE, { keyPath: "id" })
        notifStore.createIndex("scheduledTime", "scheduledTime", { unique: false })
        notifStore.createIndex("activityId", "activityId", { unique: false })
        console.log("[DB] Created notifications object store")
      }
    }
  })
}

/**
 * Save schedule to IndexedDB
 */
export async function saveSchedule(schedule: Schedule): Promise<void> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)

    const scheduleData = {
      id: "default",
      ...schedule,
      lastModified: Date.now(),
    }

    const request = store.put(scheduleData)

    request.onsuccess = () => {
      console.log("[DB] Schedule saved successfully")
      resolve()
    }

    request.onerror = () => {
      console.error("[DB] Failed to save schedule:", request.error)
      reject(request.error)
    }
  })
}

/**
 * Load schedule from IndexedDB
 */
export async function loadSchedule(): Promise<Schedule | null> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.get("default")

    request.onsuccess = () => {
      const result = request.result
      if (result) {
        console.log("[DB] Schedule loaded successfully")
        resolve({
          activities: result.activities || [],
          lastModified: result.lastModified,
        })
      } else {
        console.log("[DB] No schedule found, returning null")
        resolve(null)
      }
    }

    request.onerror = () => {
      console.error("[DB] Failed to load schedule:", request.error)
      reject(request.error)
    }
  })
}

/**
 * Delete all data (for reset functionality)
 */
export async function clearSchedule(): Promise<void> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite")
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete("default")

    request.onsuccess = () => {
      console.log("[DB] Schedule cleared successfully")
      resolve()
    }

    request.onerror = () => {
      console.error("[DB] Failed to clear schedule:", request.error)
      reject(request.error)
    }
  })
}

/**
 * Close database connection
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
    console.log("[DB] Database connection closed")
  }
}

/**
 * Save scheduled notification to IndexedDB
 */
export async function saveScheduledNotification(notification: {
  id: string
  activityId: string
  title: string
  body: string
  scheduledTime: number
  tag: string
}): Promise<void> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], "readwrite")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.put(notification)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<any[]> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], "readonly")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Delete scheduled notification by ID
 */
export async function deleteScheduledNotification(id: string): Promise<void> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], "readwrite")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.delete(id)

    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all scheduled notifications
 */
export async function clearAllScheduledNotifications(): Promise<void> {
  const db = await initDB()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([NOTIFICATIONS_STORE], "readwrite")
    const store = transaction.objectStore(NOTIFICATIONS_STORE)
    const request = store.clear()

    request.onsuccess = () => {
      console.log("[DB] All scheduled notifications cleared")
      resolve()
    }
    request.onerror = () => reject(request.error)
  })
}
