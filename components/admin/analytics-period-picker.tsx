"use client"

import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ANALYTICS_PERIOD_PRESETS,
  type AnalyticsDateRange,
  type AnalyticsPeriodPreset,
  formatRangeLabel,
  getCustomRange,
  getPresetRange,
  toDateParam,
} from "@/lib/analytics-date-range"

interface AnalyticsPeriodPickerProps {
  value: AnalyticsDateRange
  onChange: (range: AnalyticsDateRange) => void
}

export function AnalyticsPeriodPicker({ value, onChange }: AnalyticsPeriodPickerProps) {
  const [open, setOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>({
    from: value.from,
    to: value.to,
  })

  function handlePreset(preset: AnalyticsPeriodPreset) {
    onChange(getPresetRange(preset))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setDraftRange({ from: value.from, to: value.to })
    }
  }

  function applyCustomRange() {
    if (!draftRange?.from || !draftRange?.to) return
    onChange(getCustomRange(draftRange.from, draftRange.to))
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap items-center rounded-lg border border-border bg-card p-1 gap-1">
        {ANALYTICS_PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePreset(preset.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-all touch-manipulation",
              value.preset === preset.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={value.preset === "custom" ? "default" : "outline"}
            size="sm"
            className="h-8 gap-2 text-xs font-medium"
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {value.preset === "custom" ? value.label : "Période personnalisée"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium text-card-foreground">Choisir une période</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {draftRange?.from && draftRange?.to
                ? formatRangeLabel(draftRange.from, draftRange.to)
                : "Sélectionnez une date de début et de fin"}
            </p>
          </div>
          <Calendar
            mode="range"
            defaultMonth={draftRange?.from ?? value.from}
            selected={draftRange}
            onSelect={setDraftRange}
            numberOfMonths={1}
            disabled={{ after: new Date() }}
          />
          <div className="flex items-center justify-end gap-2 border-t border-border p-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const today = new Date()
                setDraftRange({ from: today, to: today })
              }}
            >
              Aujourd&apos;hui
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!draftRange?.from || !draftRange?.to}
              onClick={applyCustomRange}
            >
              Appliquer
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <span className="hidden sm:inline text-xs text-muted-foreground">
        {formatRangeLabel(value.from, value.to)}
      </span>
    </div>
  )
}

export function analyticsRangeToParams(range: AnalyticsDateRange) {
  return {
    from: toDateParam(range.from),
    to: toDateParam(range.to),
  }
}
