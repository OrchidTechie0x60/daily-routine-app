"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bell, X } from "lucide-react"
import { getNotificationPermission, requestNotificationPermission } from "@/lib/notifications"

interface NotificationPermissionBannerProps {
  onPermissionGranted?: () => void
}

export function NotificationPermissionBanner({ onPermissionGranted }: NotificationPermissionBannerProps) {
  const [permission, setPermission] = useState<"granted" | "denied" | "default">("default")
  const [dismissed, setDismissed] = useState(false)
  const [requesting, setRequesting] = useState(false)

  useEffect(() => {
    const currentPermission = getNotificationPermission()
    setPermission(currentPermission)

    // Check if previously dismissed
    const wasDismissed = localStorage.getItem("notification-banner-dismissed")
    if (wasDismissed === "true") {
      setDismissed(true)
    }
  }, [])

  const handleRequestPermission = async () => {
    setRequesting(true)
    const result = await requestNotificationPermission()
    setPermission(result)
    setRequesting(false)

    if (result === "granted") {
      setDismissed(true)
      onPermissionGranted?.()
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem("notification-banner-dismissed", "true")
  }

  if (permission === "granted" || permission === "denied" || dismissed) {
    return null
  }

  return (
    <div className="mx-4 mt-4 rounded-lg border border-accent/50 bg-accent/10 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-accent/20 p-2">
          <Bell className="size-5 text-accent-foreground" />
        </div>

        <div className="flex-1 space-y-2">
          <h3 className="text-sm font-medium">Enable Notifications</h3>
          <p className="text-xs text-muted-foreground">
            Get timely reminders for your activities. We'll notify you at the start time and before activities begin.
          </p>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleRequestPermission} disabled={requesting}>
              {requesting ? "Requesting..." : "Enable"}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Maybe Later
            </Button>
          </div>
        </div>

        <Button variant="ghost" size="icon" className="size-8" onClick={handleDismiss}>
          <X className="size-4" />
          <span className="sr-only">Dismiss</span>
        </Button>
      </div>
    </div>
  )
}
