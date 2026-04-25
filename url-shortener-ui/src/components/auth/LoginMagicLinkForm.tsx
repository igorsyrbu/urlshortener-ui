"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import React from "react";

interface LoginMagicLinkFormProps {
    email: string;
    loading: boolean;
    onEmailChange: (email: string) => void;
    onSubmit: (e: React.SyntheticEvent<HTMLFormElement>) => void;
}

export function LoginMagicLinkForm({email, loading, onEmailChange, onSubmit}: LoginMagicLinkFormProps) {
    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
                <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-xl"
                    disabled={loading}
                />
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-xl text-sm font-bold tracking-wider uppercase"
            >
                {loading ? (
                    <>
                        <div
                            className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"/>
                        Sending...
                    </>
                ) : (
                    "Sign in with Magic Link"
                )}
            </Button>
        </form>
    );
}
