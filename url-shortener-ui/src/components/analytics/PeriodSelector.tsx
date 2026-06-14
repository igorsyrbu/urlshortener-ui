"use client";

import {useEffect, useState} from "react";
import {Calendar} from "@/components/ui/calendar";
import {Calendar as CalendarIcon} from "lucide-react";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {DateRange} from "react-day-picker";
import {useMediaQuery} from "@/lib/hooks/useMediaQuery";
import {ALLOWED_YEARS, MOBILE_BREAKPOINT_PX} from "@/lib/constants";
import {DateRangeDrawer} from "@/components/analytics/DateRangeDrawer";

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

function todayAtMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

const activeClasses = "bg-muted text-foreground";
const inactiveClasses = "text-muted-foreground hover:text-foreground";

const MIN_DATE = new Date(ALLOWED_YEARS[0], 0, 1);
const MAX_DATE = todayAtMidnight();

const disabledDays = [
    {before: MIN_DATE},
    {after: MAX_DATE},
];

function isDateDisabled(dateToCheck: Date): boolean {
    return disabledDays.some((matcher) => {
        if (matcher.before !== undefined && dateToCheck < matcher.before) return true;
        return matcher.after !== undefined && dateToCheck > matcher.after;
    });
}

export function PeriodSelector({
                                   period,
                                   customDateRange,
                                   onPeriodChange,
                                   onCustomDateRangeChange,
                               }: PeriodSelectorProps) {
    const [date, setDate] = useState<DateRange | undefined>(customDateRange);
    const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT_PX - 1}px)`);
    const [drawerOpen, setDrawerOpen] = useState(false);

    useEffect(() => {
        setDate(customDateRange);
    }, [customDateRange]);

    const handleCalendarSelect = (_range: DateRange | undefined, selectedDay: Date) => {
        if (isDateDisabled(selectedDay)) {
            return;
        }

        if (!date?.from || (date?.from && date?.to)) {
            setDate({from: selectedDay, to: undefined});
        } else {
            const newRange = {from: date.from, to: selectedDay};

            if (newRange.from > newRange.to) {
                const temp = newRange.from;
                newRange.from = newRange.to;
                newRange.to = temp;
            }

            if (isDateDisabled(newRange.from) || isDateDisabled(newRange.to)) {
                setDate(undefined);
                return;
            }

            setDate(newRange);
            onCustomDateRangeChange(newRange);
        }
    };

    const handleDrawerDateRangeSelect = (range: DateRange) => {
        setDate(range);
        onCustomDateRangeChange(range);
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

            {isMobile ? (
                <>
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className={`flex-[1.5] px-2 py-1.5 justify-center rounded-md transition-colors flex items-center gap-1.5 ${period === "custom" ? activeClasses : inactiveClasses}`}
                    >
                        <CalendarIcon className="size-3.75"/>
                        Custom
                    </button>
                    <DateRangeDrawer
                        open={drawerOpen}
                        onOpenChange={setDrawerOpen}
                        onDateRangeSelect={handleDrawerDateRangeSelect}
                        initialRange={customDateRange}
                        period={period}
                    />
                </>
            ) : (
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className={`flex-none px-2 sm:px-3 py-1.5 justify-center rounded-md transition-colors flex items-center gap-1.5 sm:gap-2 ${period === "custom" ? activeClasses : inactiveClasses}`}
                        >
                            <CalendarIcon className="size-3.75 sm:size-4"/>
                            Custom
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                            autoFocus
                            mode="range"
                            defaultMonth={date?.from || new Date()}
                            selected={date}
                            onSelect={handleCalendarSelect}
                            numberOfMonths={2}
                            weekStartsOn={1}
                            startMonth={new Date(ALLOWED_YEARS[0], 0)}
                            endMonth={todayAtMidnight()}
                            disabled={disabledDays}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>
    );
}