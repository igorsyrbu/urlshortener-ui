"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import {cn} from "@/lib/utils"
import {SEGMENTED_CONTROL_LABEL_CLASS_NAME, SEGMENTED_CONTROL_HOVER_CLASS_NAME} from "@/components/ui/segmented-control-styles"

function Tabs({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn("flex flex-col gap-4", className)}
            {...props}
        />
    )
}

function TabsList({className, ...props}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn("inline-flex w-fit items-center gap-1 rounded-xl bg-muted p-1", className)}
            {...props}
        />
    )
}

function TabsTrigger({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-medium transition-colors data-[state=active]:bg-card data-[state=active]:hover:bg-card dark:data-[state=active]:hover:bg-card data-[state=active]:shadow-soft outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
                SEGMENTED_CONTROL_LABEL_CLASS_NAME,
                SEGMENTED_CONTROL_HOVER_CLASS_NAME,
                className
            )}
            {...props}
        />
    )
}

function TabsContent({className, ...props}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn("outline-none", className)}
            {...props}
        />
    )
}

export {Tabs, TabsList, TabsTrigger, TabsContent}
