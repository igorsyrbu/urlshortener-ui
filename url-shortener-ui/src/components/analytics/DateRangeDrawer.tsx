"use client";

import React, {useState, useCallback, useMemo, useRef, useEffect} from "react";
import {DateRange} from "react-day-picker";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import {Calendar} from "@/components/ui/calendar";
import {IosWheelPicker, type WheelPickerItem} from "@/components/ui/ios-wheel-picker";

import {cn} from "@/lib/utils";
import {ChevronDown, ChevronLeft, ChevronRight} from "lucide-react";
import {ALLOWED_YEARS} from "@/lib/constants";

const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

interface DateRangeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDateRangeSelect: (range: DateRange) => void;
    initialRange?: DateRange;
    period: string;
}

function todayAtMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function getDefaultRange(period: string): DateRange {
    const today = todayAtMidnight();
    if (period === "custom") {
        const from = new Date(today);
        from.setDate(from.getDate() - 6);
        return {from, to: today};
    }
    const match = period.match(/\d+/);
    const days = match ? parseInt(match[0], 10) : 7;
    const from = new Date(today);
    from.setDate(from.getDate() - days + 1);
    return {from, to: today};
}

export function DateRangeDrawer({
                                    open,
                                    onOpenChange,
                                    onDateRangeSelect,
                                    initialRange,
                                    period,
                                }: DateRangeDrawerProps) {
    const [selectedRange, setSelectedRange] = useState<DateRange | undefined>(initialRange);
    const [displayMonth, setDisplayMonth] = useState(() => new Date().getMonth());
    const [displayYear, setDisplayYear] = useState<number>(() => ALLOWED_YEARS[0]);
    const [showWheelPicker, setShowWheelPicker] = useState(false);
    const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        return () => {
            clearTimeout(bounceTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        setShowWheelPicker(false);
        const range = initialRange ?? getDefaultRange(period);
        setSelectedRange(range);
        const ref = range.to ?? new Date();
        setDisplayMonth(ref.getMonth());
        setDisplayYear(ref.getFullYear());
    }, [open, initialRange, period]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            onOpenChange(nextOpen);
        },
        [onOpenChange]
    );

    const handleMonthChange = useCallback((index: number) => {
        setDisplayMonth(index);
        clearTimeout(bounceTimeoutRef.current);
        const today = new Date();
        if (displayYear === today.getFullYear() && index > today.getMonth()) {
            bounceTimeoutRef.current = setTimeout(() => {
                setDisplayMonth(today.getMonth());
            }, 200);
        }
    }, [displayYear]);

    const handleYearChange = useCallback(
        (index: number) => {
            const year = ALLOWED_YEARS[index];
            if (year !== undefined) {
                setDisplayYear(year);
            }
        },
        []
    );

    const handleCalendarMonthChange = useCallback(
        (month: Date) => {
            setDisplayMonth(month.getMonth());
            setDisplayYear(month.getFullYear());
        },
        []
    );

    const handleSelect = useCallback(
        (_range: DateRange | undefined, selectedDay: Date) => {
            if (!selectedRange?.from || (selectedRange?.from && selectedRange?.to)) {
                setSelectedRange({from: selectedDay, to: undefined});
                return;
            }

            const from = selectedRange.from;
            const to = selectedDay;

            if (from > to) {
                onDateRangeSelect({from: to, to: from});
            } else {
                onDateRangeSelect({from, to});
            }
            onOpenChange(false);
        },
        [selectedRange, onDateRangeSelect, onOpenChange]
    );

    const handleTogglePicker = useCallback(() => {
        setShowWheelPicker((prev) => !prev);
    }, []);

    const handlePrevMonth = useCallback(() => {
        const newMonth = displayMonth - 1;
        if (newMonth < 0) {
            const newYear = displayYear - 1;
            if (!(ALLOWED_YEARS as readonly number[]).includes(newYear)) return;
            setDisplayMonth(11);
            setDisplayYear(newYear);
        } else {
            setDisplayMonth(newMonth);
        }
    }, [displayMonth, displayYear]);

    const handleNextMonth = useCallback(() => {
        const newMonth = displayMonth + 1;
        if (newMonth > 11) {
            const newYear = displayYear + 1;
            if (!(ALLOWED_YEARS as readonly number[]).includes(newYear)) return;
            setDisplayMonth(0);
            setDisplayYear(newYear);
        } else {
            setDisplayMonth(newMonth);
        }
    }, [displayMonth, displayYear]);

    const monthItems = useMemo((): WheelPickerItem[] => {
        return MONTHS.map((name) => ({
            label: name,
            disabled: false,
        }));
    }, []);

    const yearItems = useMemo((): WheelPickerItem[] => {
        return ALLOWED_YEARS.map((year) => ({
            label: String(year),
            disabled: false,
        }));
    }, []);

    const yearIndex = useMemo(
        () => ALLOWED_YEARS.indexOf(displayYear as (typeof ALLOWED_YEARS)[number]),
        [displayYear]
    );

    const displayMonthDate = useMemo(
        () => new Date(displayYear, displayMonth, 1),
        [displayYear, displayMonth]
    );

    const disabledDays = useMemo(() => {
        const today = todayAtMidnight();
        return [{after: today}];
    }, []);

    const today = todayAtMidnight();
    const minAllowedDate = new Date(ALLOWED_YEARS[0], 0, 1);
    const maxAllowedDate = today;

    const isPrevDisabled = displayYear === minAllowedDate.getFullYear() && displayMonth === minAllowedDate.getMonth();
    const isNextDisabled = displayYear === maxAllowedDate.getFullYear() && displayMonth === maxAllowedDate.getMonth();

    const headerLabel = `${MONTHS[displayMonth]} ${displayYear}`;

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="outline-hidden">
                <DrawerHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                    <div className="w-6"/>
                    <DrawerTitle className="text-base font-semibold text-foreground">
                        Select Date Range
                    </DrawerTitle>
                    <div className="w-6"/>
                </DrawerHeader>
                <DrawerDescription className="sr-only">
                    Select a date range
                </DrawerDescription>

                <div className="relative h-105 flex flex-col">
                    <div className="pl-9 pr-7 mt-4 flex items-center justify-between shrink-0">
                        <button
                            type="button"
                            onClick={handleTogglePicker}
                            className={cn("flex items-center gap-1 font-semibold text-sm antialiased", showWheelPicker ? "text-primary" : "text-foreground")}
                        >
                            {headerLabel}
                            <span className="relative w-4 h-4">
                                <ChevronRight
                                    className={cn("size-4 absolute inset-0 transition-opacity text-primary", showWheelPicker ? "opacity-0" : "opacity-100")}/>
                                <ChevronDown
                                    className={cn("size-4 absolute inset-0 transition-opacity text-primary", showWheelPicker ? "opacity-100" : "opacity-0")}/>
                            </span>
                        </button>
                        <div className={cn("flex items-center gap-1", showWheelPicker && "invisible")}>
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                disabled={isPrevDisabled}
                                aria-disabled={isPrevDisabled}
                                className="p-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-primary"
                            >
                                <ChevronLeft className="size-4"/>
                            </button>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                disabled={isNextDisabled}
                                aria-disabled={isNextDisabled}
                                className="p-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-primary"
                            >
                                <ChevronRight className="size-4"/>
                            </button>
                        </div>
                    </div>
                    <div className="relative mt-1 flex-1">
                        <div className={cn("absolute inset-0 flex flex-col", showWheelPicker && "hidden")}>
                            <div className="px-4 flex-1">
                                <Calendar
                                    mode="range"
                                    selected={selectedRange}
                                    onSelect={handleSelect}
                                    month={displayMonthDate}
                                    onMonthChange={handleCalendarMonthChange}
                                    disabled={disabledDays}
                                    numberOfMonths={1}
                                    showOutsideDays={false}
                                    disableNavigation
                                    weekStartsOn={1}
                                    formatters={{
                                        formatWeekdayName: (date: Date) => WEEKDAYS[date.getDay()],
                                    }}
                                    classNames={{
                                        month_caption: "hidden",
                                        nav: "hidden",
                                        root: "w-full",
                                        today: "text-foreground data-[selected=true]:rounded-none",
                                    }}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div
                            className={cn("absolute inset-0 flex flex-col", !showWheelPicker && "invisible pointer-events-none")}>
                            <div className="relative px-4 flex-1 flex items-center justify-center" data-vaul-no-drag>
                                <div className="ios-wheel-picker__mask ios-wheel-picker__mask--top"/>
                                <div className="ios-wheel-picker__mask ios-wheel-picker__mask--bottom"/>
                                <div
                                    className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-10 rounded-xl bg-muted/50 pointer-events-none"/>
                                <div className="flex items-center justify-center gap-2">
                                    <div className="flex-none w-34">
                                        <IosWheelPicker
                                            items={monthItems}
                                            selectedIndex={displayMonth}
                                            onChange={handleMonthChange}
                                            perspective="left"
                                            loop
                                        />
                                    </div>
                                    <div className="flex-none w-30">
                                        <IosWheelPicker
                                            items={yearItems}
                                            selectedIndex={yearIndex >= 0 ? yearIndex : 0}
                                            onChange={handleYearChange}
                                            perspective="right"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
