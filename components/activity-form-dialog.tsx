"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { Activity } from "@/lib/types"
import { getCurrentTime } from "@/lib/utils/time"

interface ActivityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: Activity | null
  onSave: (data: Omit<Activity, "id" | "createdAt" | "updatedAt"> | { id: string; updates: Partial<Activity> }) => void
}

export function ActivityFormDialog({ open, onOpenChange, activity, onSave }: ActivityFormDialogProps) {
  const [title, setTitle] = useState("")
  const [startTime, setStartTime] = useState("")
  const [duration, setDuration] = useState("")
  const [notifyAtStart, setNotifyAtStart] = useState(true)
  const [notifyBefore, setNotifyBefore] = useState(false)
  const [notifyBeforeMinutes, setNotifyBeforeMinutes] = useState("10")

  useEffect(() => {
    if (activity) {
      setTitle(activity.title)
      setStartTime(activity.startTime)
      setDuration(activity.duration?.toString() || "")
      setNotifyAtStart(activity.notifyAtStart)
      setNotifyBefore(!!activity.notifyBefore)
      setNotifyBeforeMinutes(activity.notifyBefore?.toString() || "10")
    } else {
      setTitle("")
      setStartTime(getCurrentTime())
      setDuration("")
      setNotifyAtStart(true)
      setNotifyBefore(false)
      setNotifyBeforeMinutes("10")
    }
  }, [activity, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!title || !startTime) {
      return
    }

    const activityData = {
      title,
      startTime,
      duration: duration ? Number.parseInt(duration) : undefined,
      notifyAtStart,
      notifyBefore: notifyBefore ? Number.parseInt(notifyBeforeMinutes) : undefined,
    }

    if (activity) {
      onSave({ id: activity.id, updates: activityData })
    } else {
      onSave(activityData)
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{activity ? "Edit Activity" : "Add Activity"}</DialogTitle>
            <DialogDescription>
              {activity ? "Update your activity details." : "Create a new activity for your daily routine."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Activity Title</Label>
              <Input
                id="title"
                placeholder="e.g., Morning workout"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="30"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifyAtStart" className="cursor-pointer">
                  Notify at start time
                </Label>
                <Switch id="notifyAtStart" checked={notifyAtStart} onCheckedChange={setNotifyAtStart} />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notifyBefore" className="cursor-pointer">
                  Notify before start
                </Label>
                <Switch id="notifyBefore" checked={notifyBefore} onCheckedChange={setNotifyBefore} />
              </div>

              {notifyBefore && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="notifyBeforeMinutes" className="text-xs">
                    Minutes before
                  </Label>
                  <Input
                    id="notifyBeforeMinutes"
                    type="number"
                    min="1"
                    value={notifyBeforeMinutes}
                    onChange={(e) => setNotifyBeforeMinutes(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">{activity ? "Update" : "Add"} Activity</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
