import type { Activity } from "./types"
import {
  saveScheduledNotification,
  getScheduledNotifications,
  deleteScheduledNotification,
  clearAllScheduledNotifications,
} from "./db"

// --- Platform detection ---

function isNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  )
}

// Stable 32-bit positive integer hash for Capacitor notification IDs
function toNotifId(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function createDateFromTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

export type NotificationPermissionStatus = "granted" | "denied" | "default"

// --- Native permission persistence ---
// Capacitor permission checks are async; we persist the result in localStorage
// so getNotificationPermission() returns the correct value synchronously on
// every app launch without waiting for the async bridge call.
const NATIVE_PERM_KEY = "native-notification-permission"
let _nativePermissionCache: NotificationPermissionStatus = "default"

function _readPersistedPermission(): NotificationPermissionStatus {
  try {
    const v = localStorage.getItem(NATIVE_PERM_KEY)
    if (v === "granted" || v === "denied") return v
  } catch {}
  return "default"
}

function _persistPermission(status: NotificationPermissionStatus): void {
  _nativePermissionCache = status
  try {
    if (status === "granted" || status === "denied") {
      localStorage.setItem(NATIVE_PERM_KEY, status)
    } else {
      localStorage.removeItem(NATIVE_PERM_KEY)
    }
  } catch {}
}

/**
 * Must be called once on app startup on native to verify the OS permission
 * state and create the Android notification channel.
 */
export async function initNativePermissions(): Promise<void> {
  if (!isNative()) return
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications")
    await LocalNotifications.createChannel({
      id: "routine-alerts",
      name: "Activity Reminders",
      description: "Reminders for your daily routine activities",
      importance: 5, // IMPORTANCE_HIGH
      visibility: 1, // VISIBILITY_PUBLIC
      vibration: true,
      lights: true,
    })
    const result = await LocalNotifications.checkPermissions()
    const status: NotificationPermissionStatus =
      result.display === "granted" ? "granted" :
      result.display === "denied"  ? "denied"  : "default"
    _persistPermission(status)
  } catch (e) {
    console.error("[Notifications] Native init error:", e)
  }
}

// --- Permission ---

export async function requestNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const result = await LocalNotifications.requestPermissions()
      const status: NotificationPermissionStatus = result.display === "granted" ? "granted" : "denied"
      _persistPermission(status)
      return status
    } catch (e) {
      console.error("[Notifications] Native permission request error:", e)
      return "denied"
    }
  }

  if (!("Notification" in window)) return "denied"
  if (Notification.permission === "granted") return "granted"
  if (Notification.permission === "denied") return "denied"
  try {
    return await Notification.requestPermission()
  } catch {
    return "denied"
  }
}

export function getNotificationPermission(): NotificationPermissionStatus {
  if (isNative()) {
    // localStorage is available synchronously on first render; the async
    // initNativePermissions() writes here so subsequent launches are instant.
    return _readPersistedPermission() !== "default"
      ? _readPersistedPermission()
      : _nativePermissionCache
  }
  if (!("Notification" in window)) return "denied"
  return Notification.permission
}

// --- Web-only notification display ---

function showWebNotification(title: string, options?: NotificationOptions): void {
  if (Notification.permission !== "granted") return
  try {
    const n = new Notification(title, {
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      ...options,
    })
    n.onclick = () => { window.focus(); n.close() }
  } catch (e) {
    console.error("[Notifications] Web show error:", e)
  }
}

async function showServiceWorkerNotification(title: string, options?: NotificationOptions): Promise<void> {
  if (Notification.permission !== "granted") return
  if (!("serviceWorker" in navigator)) { showWebNotification(title, options); return }
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification(title, {
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      requireInteraction: true,
      vibrate: [200, 100, 200] as unknown as undefined,
      silent: false,
      ...options,
    })
  } catch {
    showWebNotification(title, options)
  }
}

// --- Scheduling ---

/**
 * Schedule OS-level notifications for a single activity.
 * On native: uses Capacitor LocalNotifications (fires even when app is killed).
 * On web: uses window.setTimeout + Service Worker (requires tab to be open).
 * Returns numeric IDs (Capacitor IDs or timeout IDs) for later cancellation.
 */
// Inline end-time formatter so notifications.ts stays self-contained
function endTimeLabel(startTime: string, durationMins: number): string {
  const [h, m] = startTime.split(":").map(Number)
  const total = h * 60 + m + durationMins
  const eh = Math.floor(total / 60) % 24
  const em = total % 60
  const period = eh >= 12 ? "PM" : "AM"
  return `${eh % 12 || 12}:${String(em).padStart(2, "0")} ${period}`
}

export async function scheduleActivityNotifications(activity: Activity): Promise<number[]> {
  const now = new Date()
  let targetStart = createDateFromTime(activity.startTime)

  if (targetStart <= now) {
    // Grace window: if the time passed less than 2 minutes ago (e.g. reschedule ran
    // milliseconds after the alarm time, or app opened right at the notification time)
    // fire immediately instead of silently dropping it.
    const msAgo = now.getTime() - targetStart.getTime()
    if (msAgo <= 2 * 60 * 1000) {
      targetStart = new Date(now.getTime() + 3_000) // fire in 3 s
    } else {
      return [] // too far in the past — skip for today
    }
  }

  // Notification body — include end time when duration is set
  const startBody = activity.duration
    ? `${activity.title} · until ${endTimeLabel(activity.startTime, activity.duration)}`
    : `Time for: ${activity.title}`

  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const notifications: any[] = []

      if (activity.notifyAtStart) {
        notifications.push({
          id: toNotifId(`${activity.id}-start`),
          title: activity.title,
          body: startBody,
          schedule: { at: targetStart, allowWhileIdle: true },
          channelId: "routine-alerts",
          smallIcon: "ic_stat_notify",
          // Keep notification visible in the shade until user swipes it away
          autoCancel: false,
          ongoing: false,
        })
      }

      if (activity.notifyBefore && activity.notifyBefore > 0) {
        const preAlert = new Date(targetStart)
        preAlert.setMinutes(preAlert.getMinutes() - activity.notifyBefore)
        if (preAlert > now) {
          notifications.push({
            id: toNotifId(`${activity.id}-prealert`),
            title: `Upcoming: ${activity.title}`,
            body: `Starts in ${activity.notifyBefore} minutes`,
            schedule: { at: preAlert, allowWhileIdle: true },
            channelId: "routine-alerts",
            smallIcon: "ic_stat_notify",
            autoCancel: false,
            ongoing: false,
          })
        }
      }

      if (notifications.length > 0) {
        await LocalNotifications.schedule({ notifications })
      }
      return notifications.map((n) => n.id as number)
    } catch (e) {
      console.error("[Notifications] Native schedule error:", e)
      return []
    }
  }

  // --- Web fallback ---
  const timeouts: number[] = []
  const msStart = targetStart.getTime() - now.getTime()

  if (activity.notifyAtStart && msStart > 0) {
    await saveScheduledNotification({
      id: `${activity.id}-start`,
      activityId: activity.id,
      title: activity.title,
      body: startBody,
      scheduledTime: targetStart.getTime(),
      tag: `activity-${activity.id}-start`,
    })
    timeouts.push(
      window.setTimeout(async () => {
        await showServiceWorkerNotification(activity.title, {
          body: startBody,
          tag: `activity-${activity.id}-start`,
        })
        await deleteScheduledNotification(`${activity.id}-start`)
      }, msStart),
    )
  }

  if (activity.notifyBefore && activity.notifyBefore > 0) {
    const preAlert = new Date(targetStart)
    preAlert.setMinutes(preAlert.getMinutes() - activity.notifyBefore)
    const msPreAlert = preAlert.getTime() - now.getTime()
    if (msPreAlert > 0) {
      await saveScheduledNotification({
        id: `${activity.id}-prealert`,
        activityId: activity.id,
        title: `Upcoming: ${activity.title}`,
        body: `Starts in ${activity.notifyBefore} minutes`,
        scheduledTime: preAlert.getTime(),
        tag: `activity-${activity.id}-prealert`,
      })
      timeouts.push(
        window.setTimeout(async () => {
          await showServiceWorkerNotification(`Upcoming: ${activity.title}`, {
            body: `Starts in ${activity.notifyBefore} minutes`,
            tag: `activity-${activity.id}-prealert`,
          })
          await deleteScheduledNotification(`${activity.id}-prealert`)
        }, msPreAlert),
      )
    }
  }

  return timeouts
}

export async function scheduleAllNotifications(activities: Activity[]): Promise<Map<string, number[]>> {
  const map = new Map<string, number[]>()
  await Promise.all(
    activities.map(async (activity) => {
      const ids = await scheduleActivityNotifications(activity)
      if (ids.length > 0) map.set(activity.id, ids)
    }),
  )
  return map
}

export async function cancelAllNotifications(notificationMap: Map<string, number[]>): Promise<void> {
  if (isNative()) {
    try {
      const { LocalNotifications } = await import("@capacitor/local-notifications")
      const pending = await LocalNotifications.getPending()
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications })
      }
    } catch (e) {
      console.error("[Notifications] Native cancel error:", e)
    }
    notificationMap.clear()
    return
  }

  // Web: clear setTimeout IDs
  notificationMap.forEach((timeouts) => {
    timeouts.forEach((id) => window.clearTimeout(id))
  })
  notificationMap.clear()
}

export async function rescheduleNotifications(
  activities: Activity[],
  existingMap: Map<string, number[]>,
): Promise<Map<string, number[]>> {
  await cancelAllNotifications(existingMap)
  if (!isNative()) await clearAllScheduledNotifications()
  return scheduleAllNotifications(activities)
}

/**
 * Fire any notifications that were scheduled while the app was closed (web only).
 * On native the OS handles delivery; this is a no-op in that environment.
 */
export async function checkPendingNotifications(): Promise<void> {
  if (isNative()) return
  const pending = await getScheduledNotifications()
  const now = Date.now()
  for (const notif of pending) {
    if (notif.scheduledTime <= now) {
      await showServiceWorkerNotification(notif.title, { body: notif.body, tag: notif.tag })
      await deleteScheduledNotification(notif.id)
    }
  }
}
