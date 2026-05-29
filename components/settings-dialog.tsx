"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, Trash2, Info, BatteryWarning } from "lucide-react"
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

function isAndroidNative(): boolean {
  return (
    typeof window !== "undefined" &&
    !!(window as any).Capacitor?.isNativePlatform?.()
  )
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearSchedule: () => void
  activityCount: number
}

export function SettingsDialog({ open, onOpenChange, onClearSchedule, activityCount }: SettingsDialogProps) {
  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermission())
  const onNative = isAndroidNative()

  const handleRequestNotifications = async () => {
    const result = await requestNotificationPermission()
    setNotificationStatus(result)
  }

  const handleClearSchedule = () => {
    if (confirm(`Are you sure you want to delete all ${activityCount} activities? This cannot be undone.`)) {
      onClearSchedule()
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage your app preferences and data.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Notifications Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Notifications</h3>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                {notificationStatus === "granted" ? (
                  <Bell className="size-5 text-accent" />
                ) : (
                  <BellOff className="size-5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {notificationStatus === "granted"
                      ? "Enabled"
                      : notificationStatus === "denied"
                        ? "Blocked"
                        : "Not enabled"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notificationStatus === "granted"
                      ? "You'll receive timely reminders"
                      : notificationStatus === "denied"
                        ? "Enable in device Settings → Apps → Daily Routine"
                        : "Enable to get activity reminders"}
                  </p>
                </div>
              </div>

              {notificationStatus === "default" && (
                <Button size="sm" onClick={handleRequestNotifications}>
                  Enable
                </Button>
              )}
            </div>

            {/* Battery optimisation warning — Android only, shown when notifications are on */}
            {onNative && notificationStatus === "granted" && (
              <Alert className="border-amber-500/40 bg-amber-500/10">
                <BatteryWarning className="size-4 text-amber-500" />
                <AlertDescription className="text-xs">
                  <span className="font-semibold text-amber-500">Action needed for reliable alarms:</span>
                  {" "}Go to{" "}
                  <span className="font-medium">
                    Settings → Apps → Daily Routine → Battery → Unrestricted
                  </span>
                  {" "}to prevent Android from killing notifications in the background.
                </AlertDescription>
              </Alert>
            )}

            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-xs">
                Notifications stay visible in your notification shade until you dismiss them.
                Each activity fires once at its scheduled time.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

          {/* Data Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Data Management</h3>

            <div className="rounded-lg border p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Clear All Activities</p>
                    <p className="text-xs text-muted-foreground">
                      Delete your entire schedule. This action cannot be undone.
                    </p>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={handleClearSchedule}
                  disabled={activityCount === 0}
                >
                  <Trash2 className="mr-2 size-4" />
                  Clear All ({activityCount})
                </Button>
              </div>
            </div>

            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-xs">
                All data is stored locally on your device. No data is sent to any server.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
