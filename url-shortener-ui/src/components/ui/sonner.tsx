"use client";

import {CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon,} from "lucide-react"
import {useTheme} from "next-themes"
import {Toaster as Sonner, type ToasterProps} from "sonner"

const Toaster = ({...props}: ToasterProps) => {
    const {theme = "system"} = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-sans",
                    description: "group-[.toast]:text-muted-foreground",
                    actionButton:
                        "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
                    cancelButton:
                        "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
                    success:
                        "group-[.toaster]:!bg-green-100 group-[.toaster]:!text-green-900 group-[.toaster]:!border-green-200 dark:group-[.toaster]:!bg-green-950/80 dark:group-[.toaster]:!text-green-400 dark:group-[.toaster]:!border-green-900 group-[.toaster]:backdrop-blur-md",
                    error:
                        "group-[.toaster]:!bg-red-100 group-[.toaster]:!text-red-900 group-[.toaster]:!border-red-200 dark:group-[.toaster]:!bg-red-950/80 dark:group-[.toaster]:!text-red-400 dark:group-[.toaster]:!border-red-900 group-[.toaster]:backdrop-blur-md",
                },
            }}
            icons={{
                success: <CircleCheckIcon className="size-4"/>,
                info: <InfoIcon className="size-4"/>,
                warning: <TriangleAlertIcon className="size-4"/>,
                error: <OctagonXIcon className="size-4"/>,
                loading: <Loader2Icon className="size-4 animate-spin"/>,
            }}
            {...props}
        />
    )
}

export {Toaster}
