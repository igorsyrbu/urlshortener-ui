"use client";

import {useEffect, useState} from "react";
import {useTheme} from "next-themes";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";

interface ThemeOption {
    value: string;
    label: string;
    icon: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {value: "light", label: "Light", icon: "light_mode"},
    {value: "dark", label: "Dark", icon: "dark_mode"},
    {value: "system", label: "System", icon: "settings_brightness"},
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
                            className={`flex flex-col items-center justify-center p-4 border-[0.5px] rounded-xl hover:bg-muted transition-colors w-32 ${mounted && theme === option.value ? "border-primary ring-1 ring-primary" : "border-border"}`}
                        >
                            <span className="material-symbols-outlined text-3xl mb-2">{option.icon}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                        </button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
