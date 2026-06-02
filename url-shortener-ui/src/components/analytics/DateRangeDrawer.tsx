"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { DateRange } from "react-day-picker";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer";
import { Calendar } from "@/components/ui/calendar";
import { IosWheelPicker, type WheelPickerItem } from "@/components/ui/ios-wheel-picker";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { ALLOWED_YEARS } from "@/lib/constants";

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

type Step = "start" | "end";

interface DateRangeDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDateRangeSelect: (range: DateRange) => void;
    initialRange?: DateRange;
}

function todayAtMidnight(): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

function getDefaultDisplayMonth(range: DateRange | undefined): number {
    return range?.from?.getMonth() ?? new Date().getMonth();
}

function getDefaultDisplayYear(range: DateRange | undefined): number {
    return range?.from?.getFullYear() ?? ALLOWED_YEARS[0];
}

export function DateRangeDrawer({
    open,
    onOpenChange,
    onDateRangeSelect,
    initialRange,
}: DateRangeDrawerProps) {
    const [step, setStep] = useState<Step>("start");
    const [startDate, setStartDate] = useState<Date | undefined>(
        initialRange?.from
    );
    const [endDate, setEndDate] = useState<Date | undefined>(initialRange?.to);
    const [displayMonth, setDisplayMonth] = useState(() => getDefaultDisplayMonth(initialRange));
    const [displayYear, setDisplayYear] = useState(() => getDefaultDisplayYear(initialRange));
    const [showWheelPicker, setShowWheelPicker] = useState(false);
    const bounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
        return () => {
            clearTimeout(bounceTimeoutRef.current);
        };
    }, []);

    useEffect(() => {
        if (!open) return;
        setStep("start");
        setShowWheelPicker(false);
        setStartDate(initialRange?.from);
        setEndDate(initialRange?.to);
        setDisplayMonth(getDefaultDisplayMonth(initialRange));
        setDisplayYear(getDefaultDisplayYear(initialRange));
    }, [open, initialRange]);

    const handleOpenChange = useCallback(
        (nextOpen: boolean) => {
            onOpenChange(nextOpen);
        },
        [onOpenChange]
    );

    const switchToEndStep = useCallback(() => {
        setStep("end");
        setShowWheelPicker(false);
        const ref = startDate ?? new Date();
        setDisplayMonth(ref.getMonth());
        setDisplayYear(ref.getFullYear());
    }, [startDate]);

    const handleStartMonthChange = useCallback((index: number) => {
        setDisplayMonth(index);
        clearTimeout(bounceTimeoutRef.current);
        const today = new Date();
        if (displayYear === today.getFullYear() && index > today.getMonth()) {
            bounceTimeoutRef.current = setTimeout(() => {
                setDisplayMonth(today.getMonth());
            }, 200);
        }
    }, [displayYear]);

    const handleEndMonthChange = useCallback((index: number) => {
        setDisplayMonth(index);
        clearTimeout(bounceTimeoutRef.current);
        const today = new Date();
        const startMonth = startDate ? startDate.getMonth() : 0;
        const startYear = startDate ? startDate.getFullYear() : displayYear;
        if (displayYear === startYear && index < startMonth) {
            bounceTimeoutRef.current = setTimeout(() => {
                setDisplayMonth(startMonth);
            }, 200);
        }
        if (displayYear === today.getFullYear() && index > today.getMonth()) {
            bounceTimeoutRef.current = setTimeout(() => {
                setDisplayMonth(today.getMonth());
            }, 200);
        }
    }, [displayYear, startDate]);

    const handleYearChange = useCallback(
        (index: number) => {
            const year = ALLOWED_YEARS[index];
            if (year !== undefined) {
                setDisplayYear(year);
            }
        },
        []
    );

    const handleStartDaySelect = useCallback(
        (day: Date) => {
            const today = todayAtMidnight();
            if (day > today) return;
            setStartDate(day);
            setDisplayMonth(day.getMonth());
            setDisplayYear(day.getFullYear());
        },
        []
    );

    const handleEndDaySelect = useCallback(
        (day: Date) => {
            const today = todayAtMidnight();
            if (startDate && day < startDate) return;
            if (day > today) return;
            setEndDate(day);
            setDisplayMonth(day.getMonth());
            setDisplayYear(day.getFullYear());
        },
        [startDate]
    );

    const handleCalendarMonthChange = useCallback(
        (month: Date) => {
            setDisplayMonth(month.getMonth());
            setDisplayYear(month.getFullYear());
        },
        []
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

    const startMonthItems = useMemo((): WheelPickerItem[] => {
        return MONTHS.map((name) => ({
            label: name,
            disabled: false,
        }));
    }, []);

    const endMonthItems = useMemo((): WheelPickerItem[] => {
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

    const startDisabledDays = useMemo(() => {
        const today = todayAtMidnight();
        return [{ after: today }];
    }, []);

    const endDisabledDays = useMemo(() => {
        const today = todayAtMidnight();
        const matchers: Array<{ before: Date } | { after: Date }> = [{ after: today }];
        if (startDate) {
            matchers.push({ before: startDate });
        }
        return matchers;
    }, [startDate]);

    const handleConfirm = useCallback(() => {
        if (startDate && endDate) {
            onDateRangeSelect({ from: startDate, to: endDate });
            onOpenChange(false);
        }
    }, [startDate, endDate, onDateRangeSelect, onOpenChange]);

    const handleBack = useCallback(() => {
        setStep("start");
        setShowWheelPicker(false);
        const ref = startDate ?? new Date();
        setDisplayMonth(ref.getMonth());
        setDisplayYear(ref.getFullYear());
    }, [startDate]);

    const title = step === "start" ? "Select Start Date" : "Select End Date";
    const stepLabel = step === "start" ? "1/2" : "2/2";

    const currentMonthItems = step === "start" ? startMonthItems : endMonthItems;
    const handleDaySelect = step === "start" ? handleStartDaySelect : handleEndDaySelect;
    const handleMonthChange = step === "start" ? handleStartMonthChange : handleEndMonthChange;
    const currentDisabledDays = step === "start" ? startDisabledDays : endDisabledDays;
    const selectedDay = step === "start" ? startDate : endDate;

    const headerLabel = `${MONTHS[displayMonth]} ${displayYear}`;

    const today = useMemo(() => todayAtMidnight(), []);
    const isStartDateValid = startDate ? startDate <= today : false;
    const isEndDateValid = endDate
        ? endDate <= today && (!startDate || endDate >= startDate)
        : false;

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent className="outline-hidden">
                <DrawerHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                            {stepLabel}
                        </span>
                    </div>
                    <DrawerTitle className="text-base font-semibold text-foreground">
                        {title}
                    </DrawerTitle>
                    <div className="w-6" />
                </DrawerHeader>
                <DrawerDescription className="sr-only">
                    {title}
                </DrawerDescription>

                {showWheelPicker ? (
                    <div data-vaul-no-drag className="shrink-0">
                        <div className="px-4 mt-2 flex items-center">
                            <button
                                type="button"
                                onClick={handleTogglePicker}
                                className="flex items-center gap-1 text-primary font-semibold text-sm"
                            >
                                {headerLabel}
                                <ChevronDown className="size-4" />
                            </button>
                        </div>
                        <div className="relative px-4">
                            <div className="ios-wheel-picker__mask ios-wheel-picker__mask--top" />
                            <div className="ios-wheel-picker__mask ios-wheel-picker__mask--bottom" />
                            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-10 rounded-xl bg-muted/50 pointer-events-none" />
                            <div className="flex items-center justify-center gap-0">
                                <div className="flex-1">
                                    <IosWheelPicker
                                        items={currentMonthItems}
                                        selectedIndex={displayMonth}
                                        onChange={handleMonthChange}
                                        perspective="left"
                                        loop
                                    />
                                </div>
                                <div className="flex-1">
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
                ) : (
                    <div className="flex flex-col flex-1">
                        <div className="px-4 mt-2 flex items-center justify-between shrink-0">
                            <button
                                type="button"
                                onClick={handleTogglePicker}
                                className="flex items-center gap-1 text-primary font-semibold text-sm"
                            >
                                {headerLabel}
                                <ChevronRight className="size-4" />
                            </button>
                            <div className="flex items-center gap-1">
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronLeft className="size-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <ChevronRight className="size-4" />
                                </button>
                            </div>
                        </div>
                        <div className="px-4 h-[360px]">
                            <Calendar
                                mode="single"
                                selected={selectedDay}
                                onSelect={(day) => {
                                    if (day) handleDaySelect(day);
                                }}
                                month={displayMonthDate}
                                onMonthChange={handleCalendarMonthChange}
                                disabled={currentDisabledDays}
                                numberOfMonths={1}
                                showOutsideDays={false}
                                disableNavigation
                                formatters={{
                                    formatWeekdayName: (date: Date) => WEEKDAYS[date.getDay()],
                                }}
                                classNames={{
                                    month_caption: "hidden",
                                    nav: "hidden",
                                    root: "w-full",
                                }}
                                className="w-full"
                            />
                        </div>
                    </div>
                )}

                <div className="px-4 pt-4 pb-6 flex flex-col items-center gap-2">
                    {step === "start" ? (
                        <Button
                            className="w-full"
                            disabled={!isStartDateValid}
                            onClick={switchToEndStep}
                        >
                            Next
                        </Button>
                    ) : (
                        <>
                            <Button
                                className="w-full"
                                disabled={!isEndDateValid}
                                onClick={handleConfirm}
                            >
                                Done
                            </Button>
                            <button
                                type="button"
                                onClick={handleBack}
                                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Back
                            </button>
                        </>
                    )}
                </div>
            </DrawerContent>
        </Drawer>
    );
}