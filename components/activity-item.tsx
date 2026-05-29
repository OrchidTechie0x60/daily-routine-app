"use client"

import { useState, useRef } from "react"
import { Pencil, Trash2, Clock, Bell } from "lucide-react"
import type { Activity } from "@/lib/types"
import {
  formatTime,
  isActivityNow,
  isActivityUpcoming,
  getTimeUntil,
  getActivityEndTime,
} from "@/lib/utils/time"
import { cn } from "@/lib/utils"

interface ActivityItemProps {
  activity: Activity
  onEdit: (activity: Activity) => void
  onDelete: (id: string) => void
}

const ACTION_WIDTH = 128 // px — two 64 px action buttons

export function ActivityItem({ activity, onEdit, onDelete }: ActivityItemProps) {
  const isNow = isActivityNow(activity)
  const isUpcoming = isActivityUpcoming(activity)

  const [revealed, setRevealed] = useState(false)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  // ── 1. Start – end time display ──────────────────────────────────────────
  const startLabel = formatTime(activity.startTime)
  const timeLabel = activity.duration
    ? `${startLabel} – ${formatTime(getActivityEndTime(activity))}`
    : startLabel

  // ── 3. Swipe gesture handlers ────────────────────────────────────────────
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (dy > Math.abs(dx)) return          // vertical scroll — ignore
    if (dx > 48) {
      setRevealed(true)
      try { navigator.vibrate(6) } catch {} // subtle haptic on Android
    } else if (dx < -20) {
      setRevealed(false)
    }
  }

  const closeActions = () => setRevealed(false)

  const handleEdit = () => {
    closeActions()
    onEdit(activity)
  }

  const handleDelete = () => {
    closeActions()
    if (confirm("Delete this activity?")) onDelete(activity.id)
  }

  return (
    <div className="relative overflow-hidden rounded-lg">

      {/* ── Action buttons (revealed on swipe-left) ── */}
      <div className="absolute inset-y-0 right-0 flex w-32" aria-hidden={!revealed}>
        <button
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-primary text-primary-foreground text-xs font-medium active:opacity-80"
          onClick={handleEdit}
          aria-label="Edit activity"
        >
          <Pencil className="size-4" />
          Edit
        </button>
        <button
          className="flex flex-1 flex-col items-center justify-center gap-1 bg-destructive text-destructive-foreground text-xs font-medium active:opacity-80"
          onClick={handleDelete}
          aria-label="Delete activity"
        >
          <Trash2 className="size-4" />
          Delete
        </button>
      </div>

      {/* ── Sliding card ── */}
      <div
        className={cn(
          "relative flex items-start gap-3 rounded-lg border bg-card p-4",
          "transition-transform duration-200 ease-out",
          // 2. "Happening now" — left accent stripe
          isNow && "border-accent/40 border-l-[3px] border-l-accent",
          isUpcoming && !isNow && "border-muted-foreground/25",
        )}
        style={{ transform: `translateX(${revealed ? -ACTION_WIDTH : 0}px)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={revealed ? closeActions : undefined}
      >
        {/* 2. Subtle accent tint — rendered above opaque bg-card */}
        {isNow && (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-accent/8" />
        )}

        {/* Timeline dot */}
        <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
          {isNow ? (
            // 2. Pulsing dot when active
            <div className="relative size-3">
              <div className="absolute inset-0 animate-ping rounded-full bg-accent opacity-60" />
              <div className="relative size-3 rounded-full bg-accent" />
            </div>
          ) : (
            <div
              className={cn(
                "size-3 rounded-full border-2",
                isUpcoming
                  ? "border-muted-foreground bg-background"
                  : "border-muted-foreground/40 bg-background",
              )}
            />
          )}
          {activity.duration && <div className="h-8 w-0.5 bg-border" />}
        </div>

        {/* Activity content */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Title row + "Now" badge */}
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium leading-tight">{activity.title}</h3>
            {/* 2. Prominent "Now" pill */}
            {isNow && (
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold leading-tight text-accent-foreground">
                Now
              </span>
            )}
          </div>

          {/* 1. Start – end time */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5 shrink-0" />
            <span>{timeLabel}</span>
          </div>

          {/* Notification badges — hidden while "now" to reduce noise */}
          {!isNow && (activity.notifyAtStart || activity.notifyBefore) && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {activity.notifyAtStart && (
                <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Bell className="size-3" />
                  <span>At start</span>
                </div>
              )}
              {activity.notifyBefore && (
                <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  <Bell className="size-3" />
                  <span>{activity.notifyBefore}m before</span>
                </div>
              )}
            </div>
          )}

          {/* Upcoming countdown */}
          {isUpcoming && !isNow && (
            <p className="text-xs text-muted-foreground">{getTimeUntil(activity.startTime)}</p>
          )}
        </div>
      </div>
    </div>
  )
}
