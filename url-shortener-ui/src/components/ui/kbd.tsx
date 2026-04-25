import * as React from "react"
import {cn} from "@/lib/utils"

const Kbd = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({className, ...props}, ref) => {
        return (
            <kbd
                className={cn(
                    "pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Kbd.displayName = "Kbd"

const KbdGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => {
        return (
            <div
                className={cn("flex items-center gap-1", className)}
                ref={ref}
                {...props}
            />
        )
    }
)
KbdGroup.displayName = "KbdGroup"

export {Kbd, KbdGroup}
