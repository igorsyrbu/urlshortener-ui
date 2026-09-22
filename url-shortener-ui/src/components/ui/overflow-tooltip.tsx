"use client";

import {useRef, useState} from "react";
import {cn} from "@/lib/utils";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip";

interface OverflowTooltipProps {
    value: string;
    className?: string;
}

export function OverflowTooltip({value, className}: OverflowTooltipProps) {
    const textRef = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);

    const handleOpenChange = (nextOpen: boolean): void => {
        if (!nextOpen) {
            setOpen(false);
            return;
        }
        const element = textRef.current;
        setOpen(!!element && element.scrollWidth > element.clientWidth);
    };

    return (
        <Tooltip open={open} onOpenChange={handleOpenChange}>
            <TooltipTrigger asChild>
                <span ref={textRef} className={cn("truncate", className)}>
                    {value}
                </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md break-words text-wrap">
                {value}
            </TooltipContent>
        </Tooltip>
    );
}
