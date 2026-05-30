"use client"

import * as React from "react"
import {Drawer as DrawerPrimitive} from "vaul"

import {cn} from "@/lib/utils"

function Drawer({
                    shouldScaleBackground = true,
                    ...props
                }: React.ComponentProps<typeof DrawerPrimitive.Root>) {
    return (
        <DrawerPrimitive.Root
            data-slot="drawer"
            shouldScaleBackground={shouldScaleBackground}
            {...props}
        />
    )
}

function DrawerTrigger({
                           ...props
                       }: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
    return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
                          ...props
                      }: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
    return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
                         ...props
                     }: React.ComponentProps<typeof DrawerPrimitive.Close>) {
    return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
                           className,
                           ...props
                       }: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
    return (
        <DrawerPrimitive.Overlay
            data-slot="drawer-overlay"
            className={cn(
                "fixed inset-0 z-50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                className
            )}
            {...props}
        />
    )
}

function DrawerContent({
                           className,
                           children,
                           ...props
                       }: React.ComponentProps<typeof DrawerPrimitive.Content>) {
    return (
        <DrawerPortal>
            <DrawerOverlay/>
            <DrawerPrimitive.Content
                data-slot="drawer-content"
                className={cn(
                    "bg-background border-border fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-2xl border-t outline-hidden",
                    className
                )}
                {...props}
            >
                <div className="bg-foreground/20 mx-auto mt-4 h-1 w-12 rounded-full shrink-0"/>
                <div className="flex flex-col flex-1 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
                    {children}
                </div>
            </DrawerPrimitive.Content>
        </DrawerPortal>
    )
}

function DrawerHeader({
                          className,
                          ...props
                      }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="drawer-header"
            className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)}
            {...props}
        />
    )
}

function DrawerFooter({
                          className,
                          ...props
                      }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="drawer-footer"
            className={cn("mt-auto flex flex-col gap-2 p-4", className)}
            {...props}
        />
    )
}

function DrawerTitle({
                         className,
                         ...props
                     }: React.ComponentProps<typeof DrawerPrimitive.Title>) {
    return (
        <DrawerPrimitive.Title
            data-slot="drawer-title"
            className={cn("text-lg font-semibold leading-none tracking-tight", className)}
            {...props}
        />
    )
}

function DrawerDescription({
                               className,
                               ...props
                           }: React.ComponentProps<typeof DrawerPrimitive.Description>) {
    return (
        <DrawerPrimitive.Description
            data-slot="drawer-description"
            className={cn("text-muted-foreground text-sm", className)}
            {...props}
        />
    )
}

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
}
