"use client";

import * as React from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: { from: Date; to: Date }) => void;
  className?: string;
}

const presets = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date();
      return { from: startOfDay(today), to: endOfDay(today) };
    },
  },
  {
    label: "Last 7 days",
    getValue: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    },
  },
  {
    label: "Last 30 days",
    getValue: () => {
      const today = new Date();
      return { from: startOfDay(subDays(today, 29)), to: endOfDay(today) };
    },
  },
  {
    label: "This Month",
    getValue: () => {
      const today = new Date();
      return {
        from: startOfMonth(today),
        to: endOfMonth(today),
      };
    },
  },
];

export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    value ?? { from: undefined, to: undefined }
  );

  React.useEffect(() => {
    setDateRange(value ?? { from: undefined, to: undefined });
  }, [value]);

  function handlePresetSelect(preset: (typeof presets)[0]) {
    const range = preset.getValue();
    setDateRange({ from: range.from, to: range.to });
    onChange?.(range);
    setOpen(false);
  }

  function handleCalendarSelect(range: DateRange | undefined) {
    setDateRange(range);
    if (range?.from && range?.to) {
      onChange?.({ from: range.from, to: range.to });
      setOpen(false);
    } else if (range?.from) {
      onChange?.({ from: range.from, to: range.from });
    }
  }

  const displayText = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "MMM d, yyyy")} - ${format(dateRange.to, "MMM d, yyyy")}`
      : format(dateRange.from, "MMM d, yyyy")
    : "Select date range";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !dateRange?.from && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {displayText}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="flex flex-col gap-1 border-r p-2">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                className="justify-start"
                onClick={() => handlePresetSelect(preset)}
              >
                {preset.label}
              </Button>
            ))}
            <div className="my-1 border-t" />
            <span className="px-2 py-1 text-xs font-medium text-muted-foreground">
              Custom
            </span>
          </div>
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
