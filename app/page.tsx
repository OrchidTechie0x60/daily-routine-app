"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Settings, Moon, Sun } from "lucide-react"
import { useScheduleStore } from "@/lib/store"
import { ActivityItem } from "@/components/activity-item"
import { ActivityFormDialog } from "@/components/activity-form-dialog"
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
import { isActivityNow } from "@/lib/utils/time"
import { useTheme } from "@/lib/use-theme"
import { cn } from "@/lib/utils"
import type { Activity } from "@/lib/types"

// ─── Section definitions ────────────────────────────────────────────────────
// Time boundaries: Morning < 09:00 · Work 09:00–17:59 · Evening 18:00+
const SECTIONS = [
  {
    id: "morning" as const,
    label: "MORNING",
    emoji: "🌅",
    colorClass: "text-amber-400",
    bgClass: "bg-amber-400/15",
    defaultTime: "07:00",
  },
  {
    id: "work" as const,
    label: "WORK",
    emoji: "💼",
    colorClass: "text-blue-400",
    bgClass: "bg-blue-400/15",
    defaultTime: "09:00",
  },
  {
    id: "evening" as const,
    label: "EVENING",
    emoji: "🌙",
    colorClass: "text-violet-400",
    bgClass: "bg-violet-400/15",
    defaultTime: "19:00",
  },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

function getActivitySection(startTime: string): SectionId {
  const [h, m] = startTime.split(":").map(Number)
  const mins = h * 60 + m
  if (mins < 9 * 60) return "morning"
  if (mins < 18 * 60) return "work"
  return "evening"
}

export default function HomePage() {
  const { activities, isLoading, loadActivities, addActivity, updateActivity, deleteActivity, clearAllActivities } =
    useScheduleStore()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [defaultSectionTime, setDefaultSectionTime] = useState("")
  const [mounted, setMounted] = useState(false)
  const notificationMapRef = useRef<Map<string, number[]>>(new Map())
  const { theme, toggleTheme, mounted: themeMounted } = useTheme()

  // ─── Startup effects ──────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    loadActivities()
    registerServiceWorker()
    initNativePermissions().catch(console.error)

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get("action") === "add") setDialogOpen(true)

    if (getNotificationPermission() === "granted") {
      checkPendingNotifications().catch(console.error)
    }

    return () => { cancelAllNotifications(notificationMapRef.current) }
  }, [loadActivities])

  useEffect(() => {
    if (mounted && activities.length > 0 && getNotificationPermission() === "granted") {
      rescheduleNotifications(activities, notificationMapRef.current)
        .then((m) => { notificationMapRef.current = m })
        .catch(console.error)
    }
  }, [activities, mounted])

  // ─── Next-activity spotlight ──────────────────────────────────────────────
  // Returns the id of whichever activity the blinking dot should appear on:
  // • the activity happening right now (if any), OR
  // • the next upcoming activity today (if nothing is happening now)
  const highlightedId = useMemo(() => {
    if (!activities.length) return null
    const current = activities.find((a) => isActivityNow(a))
    if (current) return current.id

    const now = new Date()
    const nowMins = now.getHours() * 60 + now.getMinutes()
    const next = activities
      .filter((a) => {
        const [h, m] = a.startTime.split(":").map(Number)
        return h * 60 + m > nowMins
      })
      .sort((a, b) => {
        const [ah, am] = a.startTime.split(":").map(Number)
        const [bh, bm] = b.startTime.split(":").map(Number)
        return ah * 60 + am - (bh * 60 + bm)
      })[0]

    return next?.id ?? null
  }, [activities])

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePermissionGranted = () => {
    if (activities.length > 0) {
      scheduleAllNotifications(activities)
        .then((m) => { notificationMapRef.current = m })
        .catch(console.error)
    }
    checkPendingNotifications().catch(console.error)
  }

  const handleAddActivity = (sectionDefaultTime?: string) => {
    setEditingActivity(null)
    setDefaultSectionTime(sectionDefaultTime ?? "")
    setDialogOpen(true)
  }

  const handleEditActivity = (activity: Activity) => {
    setEditingActivity(activity)
    setDialogOpen(true)
  }

  const handleSaveActivity = async (data: any) => {
    if ("id" in data) await updateActivity(data.id, data.updates)
    else await addActivity(data)
  }

  const handleDeleteActivity = async (id: string) => {
    if (confirm("Are you sure you want to delete this activity?")) await deleteActivity(id)
  }

  const handleClearSchedule = async () => {
    await clearAllActivities()
    await cancelAllNotifications(notificationMapRef.current)
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-background pb-24 safe-area-inset">

      {/* ── Header ── */}
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

      {/* ── Main content ── */}
      <main className="mx-auto max-w-2xl px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            <CurrentTimeIndicator />

            {SECTIONS.map((section) => {
              const items = activities.filter(
                (a) => getActivitySection(a.startTime) === section.id,
              )

              return (
                <div key={section.id} className="space-y-2">

                  {/* Section header */}
                  <div className="flex items-center gap-2 pb-1">
                    <div className={cn(
                      "flex size-7 items-center justify-center rounded-lg text-sm",
                      section.bgClass,
                    )}>
                      {section.emoji}
                    </div>
                    <span className={cn(
                      "text-xs font-bold tracking-widest",
                      section.colorClass,
                    )}>
                      {section.label}
                    </span>
                  </div>

                  {/* Activities in this section */}
                  {items.map((activity) => (
                    <ActivityItem
                      key={activity.id}
                      activity={activity}
                      isNext={
                        activity.id === highlightedId && !isActivityNow(activity)
                      }
                      onEdit={handleEditActivity}
                      onDelete={handleDeleteActivity}
                    />
                  ))}

                  {/* Per-section add button */}
                  <button
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border/50 px-4 py-2.5 text-sm text-muted-foreground/60 transition-colors hover:border-muted-foreground/40 hover:text-muted-foreground active:scale-[0.99]"
                    onClick={() => handleAddActivity(section.defaultTime)}
                  >
                    <Plus className="size-3.5" />
                    <span>Add to {section.label.toLowerCase()}</span>
                  </button>

                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* ── Floating action button ── */}
      <div className="fixed bottom-6 right-6 safe-bottom">
        <Button
          size="lg"
          className="size-14 rounded-full shadow-lg transition-transform active:scale-90 hover:scale-105"
          onClick={() => handleAddActivity()}
        >
          <Plus className="size-6" />
          <span className="sr-only">Add activity</span>
        </Button>
      </div>

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activity={editingActivity}
        onSave={handleSaveActivity}
        defaultStartTime={defaultSectionTime}
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
