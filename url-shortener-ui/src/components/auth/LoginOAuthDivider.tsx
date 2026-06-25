"use client";

interface LoginOAuthDividerProps {
    label?: string;
}

export function LoginOAuthDivider({label = "or"}: LoginOAuthDividerProps) {
    return (
        <div className="relative">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"/>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-s font-medium tracking-wide text-muted-foreground">
                    {label}
                </span>
            </div>
        </div>
    );
}
