"use client"

import type {CSSProperties} from "react"
import {CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon,} from "lucide-react"
import {useTheme} from "next-themes"
import {Toaster as Sonner, type ToasterProps} from "sonner"

type CssVariables = Record<`--${string}`, string>

// Sonner's rich colours are fixed hues. These derive them from the theme tokens instead, so success stays green and
// errors red in every palette and custom theme: a light tint of the intent colour as the surface, and text mixed with
// the foreground so it stays readable on that tint in light and dark mode. Info and warning keep the plain surface.
const TOASTER_STYLE: CSSProperties & CssVariables = {
    "--normal-bg": "var(--popover)",
    "--normal-text": "var(--popover-foreground)",
    "--normal-border": "var(--border)",
    "--border-radius": "var(--radius)",
    "--success-bg": "color-mix(in oklab, var(--success) 10%, var(--popover))",
    "--success-border": "color-mix(in oklab, var(--success) 35%, var(--popover))",
    "--success-text": "color-mix(in oklab, var(--success) 45%, var(--popover-foreground))",
    "--error-bg": "color-mix(in oklab, var(--destructive) 10%, var(--popover))",
    "--error-border": "color-mix(in oklab, var(--destructive) 35%, var(--popover))",
    "--error-text": "color-mix(in oklab, var(--destructive) 45%, var(--popover-foreground))",
    "--info-bg": "var(--popover)",
    "--info-border": "var(--border)",
    "--info-text": "var(--popover-foreground)",
    "--warning-bg": "var(--popover)",
    "--warning-border": "var(--border)",
    "--warning-text": "var(--popover-foreground)",
}

const Toaster = ({...props}: ToasterProps) => {
    const {theme = "system"} = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            richColors
            // Sonner gives every toast its full 356px `--width` in unlayered CSS, which beats Tailwind's layers, hence
            // the `!`. From `sm` a toast is at least 16rem wide (a one-line message such as "Session terminated
            // successfully" fits it exactly, so short toasts share one width) and grows with longer text up to the
            // toaster's width, where it wraps. On phones Sonner's own full-width layout stays.
            toastOptions={{classNames: {toast: "font-sans sm:w-fit! sm:min-w-64"}}}
            icons={{
                success: <CircleCheckIcon className="size-4 text-success"/>,
                info: <InfoIcon className="size-4"/>,
                warning: <TriangleAlertIcon className="size-4"/>,
                error: <OctagonXIcon className="size-4 text-destructive"/>,
                loading: <Loader2Icon className="size-4 animate-spin"/>,
            }}
            style={TOASTER_STYLE}
            {...props}
        />
    )
}

export {Toaster}
