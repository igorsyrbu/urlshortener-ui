"use client";

import {useEffect, useState} from "react";
import {useTheme} from "next-themes";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Monitor, Moon, Sun, LucideIcon} from "lucide-react";

interface ThemeOption {
    value: string;
    label: string;
    icon: LucideIcon;
}

const THEME_OPTIONS: ThemeOption[] = [
    {value: "light", label: "Light", icon: Sun},
    {value: "dark", label: "Dark", icon: Moon},
    {value: "system", label: "System", icon: Monitor},
];

export function AppearanceCard() {
    const {theme, setTheme} = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize how the application looks on your device.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex gap-4">
                    {THEME_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => setTheme(option.value)}
                            className={`flex flex-col items-center justify-center p-3 border-[0.5px] rounded-xl hover:bg-muted transition-colors w-24 sm:w-28 outline-hidden focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] ${mounted && theme === option.value ? "border-primary ring-1 ring-primary" : "border-border"}`}
                        >
                            <option.icon className="size-6 mb-1.5 stroke-[1.5]"/>
                            <span className="text-xs sm:text-sm font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
