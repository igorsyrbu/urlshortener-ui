import type {Metadata} from "next";
import {Manrope} from "next/font/google";
import "./globals.css";
import {ThemeProvider} from "@/providers/theme-provider";
import {Toaster} from "@/components/ui/sonner";
import React from "react";

const manrope = Manrope({
    variable: "--font-manrope",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Short Links",
    description: "Dashboard for URL Shortener",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
                rel="stylesheet"/>
            <script
                dangerouslySetInnerHTML={{
                    __html: `document.fonts.ready.then(() => document.documentElement.classList.add('fonts-loaded'));`
                }}
            />
        </head>
        <body
            className={`${manrope.variable} font-sans antialiased bg-background text-foreground`}
            suppressHydrationWarning
        >
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
            <Toaster/>
        </ThemeProvider>
        </body>
        </html>
    );
}
