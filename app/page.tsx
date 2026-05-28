"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Moon, Sun } from "lucide-react"
import { useScheduleStore } from "@/lib/store"
import { ActivityItem } from "@/components/activity-item"
import { ActivityFormDialog } from "@/components/activity-form-dialog"
import { EmptyState } from "@/components/empty-state"
import { NotificationPermissionBanner } from "@/components/notification-permission-banner"
import { SettingsDialog } from "@/components/settings-dialog"
import { CurrentTimeIndicator } from "@/components/current-time-indicator"
import { registerServiceWorker } from "@/lib/register-sw"
import {
  initNativePermissions,
  getNotificationPermission,
  scheduleAllNotifications,
  cancelAllNotifications,
  rescheduleNotifications,
  checkPendingNotifications,
} from "@/lib/notifications"
import { useTheme } from "@/lib/use-theme"
import type { Activity } from "@/lib/types"

export default function HomePage() {
  const { activities, isLoading, loadActivities, addActivity, updateActivity, deleteActivity, clearAllActivities } =
    useScheduleStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [mounted, setMounted] = useState(false)
  const notificationMapRef = useRef<Map<string, number[]>>(new Map())
  const { theme, toggleTheme, mounted: themeMounted } = useTheme()

  useEffect(() => {
    setMounted(true)
    loadActivities()
    registerServiceWorker()

    // Prime native permission cache and create Android notification channel
    initNativePermissions().catch((err) => {
      console.error("[App] Failed to init native permissions:", err)
    })

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("action") === "add") {
      setDialogOpen(true)
    }

    if (getNotificationPermission() === "granted") {
      checkPendingNotifications().catch((err) => {
        console.error("[App] Failed to check pending notifications:", err)
      })
    }

    return () => {
      // Fire-and-forget: async cancel is safe here
      cancelAllNotifications(notificationMapRef.current)
    }
  }, [loadActivities])

  useEffect(() => {
    if (mounted && activities.length > 0 && getNotificationPermission() === "granted") {
      rescheduleNotifications(activities, notificationMapRef.current)
        .then((newMap) => {
          notificationMapRef.current = newMap
        })
        .catch((err) => {
          console.error("[App] Failed to reschedule notifications:", err)
        })
    }
  }, [activities, mounted])

  const handlePermissionGranted = () => {
    if (activities.length > 0) {
      scheduleAllNotifications(activities)
        .then((newMap) => {
          notificationMapRef.current = newMap
        })
        .catch((err) => {
          console.error("[App] Failed to schedule notifications:", err)
        })
    }
    checkPendingNotifications().catch((err) => {
      console.error("[App] Failed to check pending notifications:", err)
    })
  }

  const handleAddActivity = () => {
    setEditingActivity(null)
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setDialogOpen(true)
  }

  const handleSaveActivity = async (data: any) => {
    if ("id" in data) {
      await updateActivity(data.id, data.updates)
    } else {
      await addActivity(data)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    if (confirm("Are you sure you want to delete this activity?")) {
      await deleteActivity(id)
    }
  }

  const handleClearSchedule = async () => {
    await clearAllActivities()
    await cancelAllNotifications(notificationMapRef.current)
  }

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pb-24 safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-top">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Daily Routine</h1>
            <p className="text-xs text-muted-foreground">
              {activities.length} {activities.length === 1 ? "activity" : "activities"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              disabled={!themeMounted}
              className="transition-transform active:scale-95 hover:scale-110"
            >
              {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
              <span className="sr-only">Toggle theme</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} className="active:scale-95">
              <Settings className="size-5" />
              <span className="sr-only">Settings</span>
            </Button>
          </div>
        </div>
      </header>

      <NotificationPermissionBanner onPermissionGranted={handlePermissionGranted} />

      {/* Main content */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
          </div>
        ) : activities.length === 0 ? (
          <EmptyState onAddActivity={handleAddActivity} />
        ) : (
          <div className="space-y-4">
            <CurrentTimeIndicator />
            <div className="space-y-3">
              {activities.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  activity={activity}
                  onEdit={handleEditActivity}
                  onDelete={handleDeleteActivity}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Floating action button */}
      {activities.length > 0 && (
        <div className="fixed bottom-6 right-6 safe-bottom">
          <Button
            size="lg"
            className="size-14 rounded-full shadow-lg transition-transform active:scale-90 hover:scale-105"
            onClick={handleAddActivity}
          >
            <Plus className="size-6" />
            <span className="sr-only">Add activity</span>
          </Button>
        </div>
      )}

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        onSave={handleSaveActivity}
      />

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onClearSchedule={handleClearSchedule}
        activityCount={activities.length}
      />
    </div>
  )
}
