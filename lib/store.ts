/**
 * Zustand store for global state management
 * Manages activities, schedule state, and UI state
 */

import { create } from "zustand"
import type { Activity, Schedule, ApplyChangesMode } from "./types"
import { loadSchedule, saveSchedule } from "./db"
import { sortActivitiesByTime } from "./utils/time"

interface ScheduleState {
  // Data
  activities: Activity[]
  isLoading: boolean
  lastSynced: number | null

  // UI State
  isEditing: boolean
  editingActivity: Activity | null
  applyChangesMode: ApplyChangesMode

  // Actions
  loadActivities: () => Promise<void>
  addActivity: (activity: Omit<Activity, "id" | "createdAt" | "updatedAt">) => Promise<void>
  updateActivity: (id: string, updates: Partial<Activity>) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  reorderActivities: () => void
  clearAllActivities: () => Promise<void>

  // UI Actions
  setEditing: (isEditing: boolean) => void
  setEditingActivity: (activity: Activity | null) => void
  setApplyChangesMode: (mode: ApplyChangesMode) => void
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  // Initial state
  activities: [],
  isLoading: true,
  lastSynced: null,
  isEditing: false,
  editingActivity: null,
  applyChangesMode: "immediate",

  // Load activities from IndexedDB
  loadActivities: async () => {
    try {
      set({ isLoading: true })
      const schedule = await loadSchedule()

      if (schedule) {
        const sortedActivities = sortActivitiesByTime(schedule.activities)
        set({
          activities: sortedActivities,
          lastSynced: schedule.lastModified,
          isLoading: false,
        })
      } else {
        set({ activities: [], isLoading: false })
      }
    } catch (error) {
      console.error("[Store] Failed to load activities:", error)
      set({ isLoading: false })
    }
  },

  // Add new activity
  addActivity: async (activityData) => {
    try {
      const newActivity: Activity = {
        ...activityData,
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      const updatedActivities = [...get().activities, newActivity]
      const sortedActivities = sortActivitiesByTime(updatedActivities)

      set({ activities: sortedActivities })

      const schedule: Schedule = {
        activities: sortedActivities,
        lastModified: Date.now(),
      }

      await saveSchedule(schedule)
      set({ lastSynced: schedule.lastModified })
    } catch (error) {
      console.error("[Store] Failed to add activity:", error)
    }
  },

  // Update existing activity
  updateActivity: async (id, updates) => {
    try {
      const updatedActivities = get().activities.map((activity) =>
        activity.id === id ? { ...activity, ...updates, updatedAt: Date.now() } : activity,
      )

      const sortedActivities = sortActivitiesByTime(updatedActivities)
      set({ activities: sortedActivities })

      const schedule: Schedule = {
        activities: sortedActivities,
        lastModified: Date.now(),
      }

      await saveSchedule(schedule)
      set({ lastSynced: schedule.lastModified })
    } catch (error) {
      console.error("[Store] Failed to update activity:", error)
    }
  },

  // Delete activity
  deleteActivity: async (id) => {
    try {
      const updatedActivities = get().activities.filter((activity) => activity.id !== id)

      set({ activities: updatedActivities })

      const schedule: Schedule = {
        activities: updatedActivities,
        lastModified: Date.now(),
      }

      await saveSchedule(schedule)
      set({ lastSynced: schedule.lastModified })
    } catch (error) {
      console.error("[Store] Failed to delete activity:", error)
    }
  },

  // Re-sort activities by time
  reorderActivities: () => {
    const sortedActivities = sortActivitiesByTime(get().activities)
    set({ activities: sortedActivities })
  },

  // Clear all activities
  clearAllActivities: async () => {
    try {
      set({ activities: [] })

      const schedule: Schedule = {
        activities: [],
        lastModified: Date.now(),
      }

      await saveSchedule(schedule)
      set({ lastSynced: schedule.lastModified })
    } catch (error) {
      console.error("[Store] Failed to clear activities:", error)
    }
  },

  // UI Actions
  setEditing: (isEditing) => set({ isEditing }),
  setEditingActivity: (activity) => set({ editingActivity: activity }),
  setApplyChangesMode: (mode) => set({ applyChangesMode: mode }),
}))
