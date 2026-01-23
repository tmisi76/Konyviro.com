import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, subDays } from "date-fns";
import { hu } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (value: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: "7 nap", days: 7 },
    { label: "30 nap", days: 30 },
    { label: "90 nap", days: 90 },
  ];

  return (
    <div className="flex items-center gap-2">
      {presets.map((preset) => (
        <Button
          key={preset.days}
          variant="outline"
          size="sm"
          onClick={() => onChange({ from: subDays(new Date(), preset.days), to: new Date() })}
          className={cn(
            Math.round((value.to.getTime() - value.from.getTime()) / (1000 * 60 * 60 * 24)) === preset.days
              ? "bg-primary text-primary-foreground"
              : ""
          )}
        >
          {preset.label}
        </Button>
      ))}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <CalendarIcon className="h-4 w-4" />
            {format(value.from, "MMM d", { locale: hu })} - {format(value.to, "MMM d", { locale: hu })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: value.from, to: value.to }}
            onSelect={(range: DateRange | undefined) => {
              if (range?.from && range?.to) {
                onChange({ from: range.from, to: range.to });
                setIsOpen(false);
              }
            }}
            numberOfMonths={2}
            locale={hu}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
