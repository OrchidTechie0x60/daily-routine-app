"use client"

import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  onAddActivity: () => void
}

export function EmptyState({ onAddActivity }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-muted p-6">
        <CalendarClock className="size-12 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium">No activities yet</h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Start building your daily routine by adding your first activity.
      </p>
      <Button onClick={onAddActivity} className="mt-6">
        Add Your First Activity
      </Button>
    </div>
  )
}
