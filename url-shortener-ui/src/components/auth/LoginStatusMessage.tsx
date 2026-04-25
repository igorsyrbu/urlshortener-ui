"use client";

import {cn} from "@/lib/utils";

export type LoginMessage = {
    type: "success" | "error";
    text: string;
};

interface LoginStatusMessageProps {
    message: LoginMessage | null;
}

export function LoginStatusMessage({message}: LoginStatusMessageProps) {
    if (!message) {
        return null;
    }

    const isSuccess = message.type === "success";

    return (
        <div
            className={cn(
                "rounded-lg border p-4",
                isSuccess
                    ? "border-success/20 bg-success/10 text-success dark:text-success"
                    : "border-destructive/20 bg-destructive/10 text-destructive",
            )}
        >
            <p className="flex items-center gap-2 text-sm font-medium">
                {isSuccess ? "✓ " : "✗ "}
                {message.text}
            </p>
        </div>
    );
}
