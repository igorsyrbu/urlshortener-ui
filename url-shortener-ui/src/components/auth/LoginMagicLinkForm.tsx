"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Send} from "lucide-react";
import React from "react";

interface LoginMagicLinkFormProps {
    email: string;
    loading: boolean;
    inputDisabled?: boolean;
    buttonDisabled?: boolean;
    turnstileEnabled?: boolean;
    turnstileSolved?: boolean;
    onEmailChange: (email: string) => void;
    onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

export function LoginMagicLinkForm({
                                       email,
                                       loading,
                                       inputDisabled = false,
                                       buttonDisabled = false,
                                       turnstileEnabled = false,
                                       turnstileSolved = false,
                                       onEmailChange,
                                       onSubmit
                                   }: LoginMagicLinkFormProps) {
    const isTurnstileVerifying = turnstileEnabled && !turnstileSolved;
    const isButtonDisabled = loading || buttonDisabled || isTurnstileVerifying;

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="flex flex-col gap-3">
                <label htmlFor="email" className="pl-2 text-sm font-medium text-muted-foreground">
                    Email address
                </label>
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-xl"
                    disabled={loading || inputDisabled}
                />
            </div>

            <Button
                type="submit"
                disabled={isButtonDisabled}
                className="h-12 w-full rounded-xl text-sm font-semibold"
            >
                {loading ? (
                    <>
                        <ButtonSpinner className="text-primary-foreground"/>
                        Sending magic link...
                    </>
                ) : isTurnstileVerifying ? (
                    <>
                        <ButtonSpinner className="text-primary-foreground"/>
                        Verifying...
                    </>
                ) : (
                    <>
                        <Send className="size-4"/>
                        Send magic link
                    </>
                )}
            </Button>
        </form>
    );
}
