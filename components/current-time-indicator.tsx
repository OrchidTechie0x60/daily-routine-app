"use client"

import { useEffect, useState } from "react"
import { getCurrentTime, formatTime } from "@/lib/utils/time"
import { Clock } from "lucide-react"

export function CurrentTimeIndicator() {
  const [currentTime, setCurrentTime] = useState("")

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(getCurrentTime())
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  if (!currentTime) return null

  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
      <Clock className="size-4 text-muted-foreground" />
      <span className="text-muted-foreground">Current time:</span>
      <span className="font-medium">{formatTime(currentTime)}</span>
    </div>
  )
}
