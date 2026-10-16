"use client";

import Link from "next/link";
import {useCallback, useRef, type ReactNode} from "react";
import {useReducedMotion} from "framer-motion";
import {cn} from "@/lib/utils";
import {useSegmentedIndicator, type SegmentedIndicator} from "@/lib/hooks/useSegmentedIndicator";
import {
    SEGMENTED_CONTROL_HOVER_CLASS_NAME,
    SEGMENTED_CONTROL_LABEL_CLASS_NAME,
} from "@/components/ui/segmented-control-styles";

export interface SegmentedControlOption {
    value: string;
    label: string;
    href?: string;
    suffix?: ReactNode;
}

interface SegmentedControlProps {
    options: readonly SegmentedControlOption[];
    value: string;
    onValueChange?: (value: string) => void;
    ariaLabel: string;
    isDisabled?: boolean;
}

const CONTAINER_CLASS_NAME = "relative flex w-full max-w-full items-center gap-1 rounded-xl bg-muted p-1 sm:inline-flex sm:w-fit";
const OPTION_CLASS_NAME =
    "relative inline-flex min-h-10 min-w-0 max-w-full flex-1 items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:flex-none";
const THUMB_TEST_ID = "segmented-control-thumb";

function isLinkMode(options: readonly SegmentedControlOption[]): boolean {
    return options.length > 0 && options.every((option) => option.href !== undefined);
}

function renderLabel(option: SegmentedControlOption): ReactNode {
    return (
        <span className="relative flex min-w-0 items-center gap-1">
            <span className="min-w-0 truncate" title={option.label}>
                {option.label}
            </span>
            {option.suffix && (
                <>
                    {" "}
                    <span className="shrink-0">{option.suffix}</span>
                </>
            )}
        </span>
    );
}

function renderThumb(indicator: SegmentedIndicator, animate: boolean): ReactNode {
    if (!indicator.isReady) return null;
    return (
        <span
            aria-hidden="true"
            data-testid={THUMB_TEST_ID}
            className={cn(
                "absolute top-1 bottom-1 left-0 rounded-lg bg-card shadow-soft",
                animate && "transition-[transform,width] duration-200 ease-out",
            )}
            style={{transform: `translateX(${indicator.x}px)`, width: indicator.width}}
        />
    );
}

export function SegmentedControl({options, value, onValueChange, ariaLabel, isDisabled = false}: SegmentedControlProps) {
    const hasReducedMotion = useReducedMotion() ?? false;
    const selectedRef = useRef<HTMLElement | null>(null);
    const indicator = useSegmentedIndicator(selectedRef, value);
    const animateThumb = indicator.shouldAnimate && !hasReducedMotion;

    const assignSelectedRef = useCallback((element: HTMLElement | null): void => {
        selectedRef.current = element;
    }, []);

    if (isLinkMode(options)) {
        return (
            <nav aria-label={ariaLabel} className={cn(CONTAINER_CLASS_NAME, "min-h-10")}>
                {renderThumb(indicator, animateThumb)}
                {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                        <Link
                            key={option.value}
                            ref={isSelected ? assignSelectedRef : undefined}
                            href={option.href ?? option.value}
                            aria-current={isSelected ? "page" : undefined}
                            className={cn(OPTION_CLASS_NAME, SEGMENTED_CONTROL_LABEL_CLASS_NAME, !isSelected && SEGMENTED_CONTROL_HOVER_CLASS_NAME)}
                        >
                            {renderLabel(option)}
                        </Link>
                    );
                })}
            </nav>
        );
    }

    return (
        <div role="group" aria-label={ariaLabel} className={CONTAINER_CLASS_NAME}>
            {renderThumb(indicator, animateThumb)}
            {options.map((option) => {
                const isSelected = option.value === value;
                return (
                    <button
                        key={option.value}
                        ref={isSelected ? assignSelectedRef : undefined}
                        type="button"
                        aria-pressed={isSelected}
                        disabled={isDisabled}
                        onClick={() => onValueChange?.(option.value)}
                        className={cn(OPTION_CLASS_NAME, SEGMENTED_CONTROL_LABEL_CLASS_NAME, !isSelected && SEGMENTED_CONTROL_HOVER_CLASS_NAME)}
                    >
                        {renderLabel(option)}
                    </button>
                );
            })}
        </div>
    );
}
