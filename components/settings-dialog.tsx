"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bell, BellOff, Trash2, Info } from "lucide-react"
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClearSchedule: () => void
  activityCount: number
}

export function SettingsDialog({ open, onOpenChange, onClearSchedule, activityCount }: SettingsDialogProps) {
  const [notificationStatus, setNotificationStatus] = useState(getNotificationPermission())

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
                        ? "Enable in browser settings"
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

            <Alert>
              <Info className="size-4" />
              <AlertDescription className="text-xs">
                On Android, notifications fire reliably even when the app is closed. On web/PWA, keep the tab open for
                best results.
              </AlertDescription>
            </Alert>
          </div>

          <Separator />

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
                All data is stored locally on your device using IndexedDB. No data is sent to any server.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
