/**
 * Time utility functions using native JavaScript Date
 * Handles time formatting, parsing, and sorting
 */

import type { Activity } from "../types"

/**
 * Parse HH:mm time string to minutes since midnight
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/**
 * Create a Date object for today with specified HH:mm time
 */
function createDateFromTime(time: string): Date {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

/**
 * Sort activities by start time (chronological order)
 */
export function sortActivitiesByTime(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => {
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  })
}

/**
 * Format time string for display
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number)
  const period = hours >= 12 ? "PM" : "AM"
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, "0")} ${period}`
}

/**
 * Parse time input to HH:mm format
 */
export function parseTimeToFormat(time: string): string {
  // If already in HH:mm format
  if (/^\d{2}:\d{2}$/.test(time)) {
    return time
  }

  // Parse 12-hour format
  const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i)
  if (match) {
    let hours = Number.parseInt(match[1])
    const minutes = match[2]
    const period = match[3].toUpperCase()

    if (period === "PM" && hours !== 12) hours += 12
    if (period === "AM" && hours === 12) hours = 0

    return `${hours.toString().padStart(2, "0")}:${minutes}`
  }

  return time
}

/**
 * Get current time in HH:mm format
 */
export function getCurrentTime(): string {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, "0")
  const minutes = now.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

/**
 * Check if activity should be shown as "now"
 */
export function isActivityNow(activity: Activity): boolean {
  const now = new Date()
  const startTime = createDateFromTime(activity.startTime)
  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + (activity.duration || 30))

  return now >= startTime && now < endTime
}

/**
 * Check if activity is upcoming (within next hour)
 */
export function isActivityUpcoming(activity: Activity): boolean {
  const now = new Date()
  const startTime = createDateFromTime(activity.startTime)
  const inOneHour = new Date(now)
  inOneHour.setHours(inOneHour.getHours() + 1)

  return startTime > now && startTime < inOneHour
}

/**
 * Get activity end time
 */
export function getActivityEndTime(activity: Activity): string {
  const startTime = createDateFromTime(activity.startTime)
  const endTime = new Date(startTime)
  endTime.setMinutes(endTime.getMinutes() + (activity.duration || 30))

  const hours = endTime.getHours().toString().padStart(2, "0")
  const minutes = endTime.getMinutes().toString().padStart(2, "0")
  return `${hours}:${minutes}`
}

/**
 * Calculate time until activity
 */
export function getTimeUntil(time: string): string {
  const now = new Date()
  let targetTime = createDateFromTime(time)

  // If time is in the past today, assume it's tomorrow
  if (targetTime < now) {
    targetTime = new Date(targetTime)
    targetTime.setDate(targetTime.getDate() + 1)
  }

  const diffMs = targetTime.getTime() - now.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 60) {
    return `in ${diffMinutes}m`
  }

  const hours = Math.floor(diffMinutes / 60)
  const minutes = diffMinutes % 60
  return `in ${hours}h ${minutes}m`
}
