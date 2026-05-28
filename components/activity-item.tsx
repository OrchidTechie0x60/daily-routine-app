"use client"

import { Button } from "@/components/ui/button"
import { Pencil, Trash2, Clock, Bell } from "lucide-react"
import type { Activity } from "@/lib/types"
import { formatTime, isActivityNow, isActivityUpcoming, getTimeUntil } from "@/lib/utils/time"
import { cn } from "@/lib/utils"

interface ActivityItemProps {
  activity: Activity
  onEdit: (activity: Activity) => void
  onDelete: (id: string) => void
}

export function ActivityItem({ activity, onEdit, onDelete }: ActivityItemProps) {
  const isNow = isActivityNow(activity)
  const isUpcoming = isActivityUpcoming(activity)

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-4 transition-colors",
        isNow && "border-accent bg-accent/5",
        isUpcoming && "border-muted-foreground/30",
      )}
    >
      {/* Timeline indicator */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <div
          className={cn(
            "size-3 rounded-full border-2",
            isNow ? "border-accent bg-accent" : "border-muted-foreground bg-background",
          )}
        />
        {activity.duration && <div className="h-8 w-0.5 bg-border" />}
      </div>

      {/* Activity content */}
      <div className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className={cn("font-medium leading-tight", isNow && "text-accent-foreground")}>{activity.title}</h3>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="size-3.5" />
              <span>{formatTime(activity.startTime)}</span>
              {activity.duration && <span className="text-xs">({activity.duration} min)</span>}
            </div>
          </div>

          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="size-8" onClick={() => onEdit(activity)}>
              <Pencil className="size-4" />
              <span className="sr-only">Edit activity</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(activity.id)}
            >
              <Trash2 className="size-4" />
              <span className="sr-only">Delete activity</span>
            </Button>
          </div>
        </div>

        {/* Notification badges */}
        {(activity.notifyAtStart || activity.notifyBefore) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {activity.notifyAtStart && (
              <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Bell className="size-3" />
                <span>At start</span>
              </div>
            )}
            {activity.notifyBefore && (
              <div className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                <Bell className="size-3" />
                <span>{activity.notifyBefore} min before</span>
              </div>
            )}
          </div>
        )}

        {/* Time status */}
        {isNow && <div className="text-xs font-medium text-accent">Happening now</div>}
        {isUpcoming && <div className="text-xs text-muted-foreground">{getTimeUntil(activity.startTime)}</div>}
      </div>
    </div>
  )
}
