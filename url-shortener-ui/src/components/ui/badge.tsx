import {cva} from "class-variance-authority";
import * as React from "react";

import {cn} from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center justify-center rounded-md border-[0.5px] px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive: "border-transparent bg-destructive text-white hover:bg-destructive/80",
                outline: "text-foreground hover:bg-muted",
                red: "border-red-700/20 bg-red-100 text-red-700 hover:bg-red-200 dark:border-red-300/20 dark:bg-red-950 dark:text-red-300",
                yellow: "border-yellow-700/20 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:border-yellow-300/20 dark:bg-yellow-950 dark:text-yellow-300",
                lime: "border-lime-700/20 bg-lime-100 text-lime-700 hover:bg-lime-200 dark:border-lime-300/20 dark:bg-lime-950 dark:text-lime-300",
                green: "border-green-700/20 bg-green-100 text-green-700 hover:bg-green-200 dark:border-green-300/20 dark:bg-green-950 dark:text-green-300",
                blue: "border-blue-700/20 bg-blue-100 text-blue-700 hover:bg-blue-200 dark:border-blue-300/20 dark:bg-blue-950 dark:text-blue-300",
                cyan: "border-cyan-700/20 bg-cyan-100 text-cyan-700 hover:bg-cyan-200 dark:border-cyan-300/20 dark:bg-cyan-950 dark:text-cyan-300",
                purple: "border-purple-700/20 bg-purple-100 text-purple-700 hover:bg-purple-200 dark:border-purple-300/20 dark:bg-purple-950 dark:text-purple-300",
                gray: "border-zinc-700/20 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:border-zinc-300/20 dark:bg-secondary dark:text-zinc-300",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "red" | "yellow" | "lime" | "green" | "blue" | "cyan" | "purple" | "gray";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    variant?: BadgeVariant;
}

function Badge({className, variant, ...props}: BadgeProps) {
    return (
        <span className={cn(badgeVariants({variant}), className)} {...props} />
    );
}

export {Badge, badgeVariants};
