/**
 * Type definitions for the Daily Routine Scheduler
 */

export interface Activity {
  id: string
  title: string
  startTime: string // Format: "HH:mm" (24-hour)
  duration?: number // Duration in minutes
  notifyAtStart: boolean
  notifyBefore?: number // Minutes before to notify (e.g., 10)
  createdAt: number
  updatedAt: number
}

export interface Schedule {
  activities: Activity[]
  lastModified: number
}

export interface NotificationPermissionState {
  granted: boolean
  requested: boolean
}

export type ApplyChangesMode = "immediate" | "next-day"
