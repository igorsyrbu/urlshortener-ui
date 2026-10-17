import type {Metadata, Viewport} from "next";
import {Manrope} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/providers/theme-provider";
import {PaletteProvider} from "@/providers/palette-provider";
import {buildPaletteInitScript} from "@/lib/themes/palette-init-script";
import {Toaster} from "@/components/ui/sonner";
import React from "react";
import {APP_NAME} from "@/lib/constants";

const manrope = Manrope({
    variable: "--font-manrope",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: {default: APP_NAME, template: `%s | ${APP_NAME}`},
    description: "Dashboard for URL Shortener",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: [
        {media: "(prefers-color-scheme: light)", color: "#ffffff"},
        {media: "(prefers-color-scheme: dark)", color: "#1e1e1e"},
    ],
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body
            className={`${manrope.variable} font-sans antialiased bg-background text-foreground`}
            suppressHydrationWarning
        >
        <script dangerouslySetInnerHTML={{__html: buildPaletteInitScript()}}/>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <PaletteProvider>
                {children}
                <Toaster/>
            </PaletteProvider>
        </ThemeProvider>
        </body>
        </html>
    );
}
