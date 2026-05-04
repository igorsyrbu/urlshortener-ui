"use client";

import {useEffect, useState} from "react";
import {Calendar} from "@/components/ui/calendar";
import {Calendar as CalendarIcon} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {DateRange} from "react-day-picker";

interface PeriodSelectorProps {
    period: string;
    customDateRange: DateRange | undefined;
    onPeriodChange: (period: string) => void;
    onCustomDateRangeChange: (range: DateRange) => void;
}

interface PeriodOption {
    value: string;
    label: string;
}

const PRESET_PERIODS: PeriodOption[] = [
    {value: "P7D", label: "7d"},
    {value: "P30D", label: "30d"},
    {value: "P90D", label: "90d"},
];

const activeClasses = "bg-muted text-foreground";
const inactiveClasses = "text-muted-foreground hover:text-foreground";

export function PeriodSelector({
                                   period,
                                   customDateRange,
                                   onPeriodChange,
                                   onCustomDateRangeChange,
                               }: PeriodSelectorProps) {
    const [date, setDate] = useState<DateRange | undefined>(customDateRange);

    useEffect(() => {
        setDate(customDateRange);
    }, [customDateRange]);

    const handleCalendarSelect = (_range: DateRange | undefined, selectedDay: Date) => {
        if (!date?.from || (date?.from && date?.to)) {
            setDate({from: selectedDay, to: undefined});
        } else {
            const newRange = {from: date.from, to: selectedDay};

            // Ensure from < to
            if (newRange.from > newRange.to) {
                const temp = newRange.from;
                newRange.from = newRange.to;
                newRange.to = temp;
            }

            setDate(newRange);
            onCustomDateRangeChange(newRange);
        }
    };

    return (
        <div
            className="flex bg-background border-[0.5px] border-border/50 rounded-lg p-1 -mt-1 text-sm font-medium w-full sm:w-auto overflow-hidden">
            {PRESET_PERIODS.map((preset) => (
                <button
                    key={preset.value}
                    onClick={() => onPeriodChange(preset.value)}
                    className={`outline-none focus:outline-none focus-visible:ring-0 flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md transition-colors text-center ${period === preset.value ? activeClasses : inactiveClasses}`}
                >
                    {preset.label}
                </button>
            ))}

            <Popover>
                <PopoverTrigger asChild>
                    <button
                        className={`flex-[1.5] sm:flex-none px-2 sm:px-3 py-1.5 justify-center rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${period === "custom" ? activeClasses : inactiveClasses}`}
                    >
                        <CalendarIcon className="size-[15px] sm:size-[16px]" />
                        Custom
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from || new Date()}
                        selected={date}
                        onSelect={handleCalendarSelect}
                        numberOfMonths={2}
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
}
