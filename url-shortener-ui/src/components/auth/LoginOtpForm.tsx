"use client";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot} from "@/components/ui/input-otp";
import {X} from "lucide-react";
import React from "react";

interface LoginOtpFormProps {
    email: string;
    code: string;
    loading: boolean;
    onCodeChange: (code: string) => void;
    onSubmit: (code?: string) => void;
    onChangeEmail: () => void;
}

export function LoginOtpForm({
                                  email,
                                  code,
                                  loading,
                                  onCodeChange,
                                  onSubmit,
                                  onChangeEmail,
                              }: LoginOtpFormProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(code);
    };

    const handleComplete = (completedCode: string) => {
        if (loading) return;
        onCodeChange(completedCode);
        onSubmit(completedCode);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex flex-col gap-2">
                <label htmlFor="otp-email" className="pl-1 text-sm font-medium text-muted-foreground">
                    Email
                </label>
                <div className="relative">
                    <Input
                        id="otp-email"
                        type="email"
                        value={email}
                        readOnly
                        className="h-11 rounded-xl pr-10 text-sm bg-muted/30 font-medium"
                        disabled={loading}
                    />
                    <button
                        type="button"
                        onClick={onChangeEmail}
                        disabled={loading}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                        aria-label="Change email address"
                    >
                        <X className="size-4"/>
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-2.5">
                <InputOTP
                    id="otp-code"
                    maxLength={6}
                    value={code}
                    onChange={onCodeChange}
                    onComplete={handleComplete}
                    disabled={loading}
                    aria-label="Verification code"
                    containerClassName="justify-center py-1"
                >
                    <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                    </InputOTPGroup>
                </InputOTP>
                <p className="text-center text-xs sm:text-sm text-muted-foreground">
                    We sent a 6-digit verification code to your inbox
                </p>
            </div>

            <Button
                type="submit"
                disabled={loading || code.length < 6}
                className="h-12 w-full rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
                {loading ? (
                    <>
                        <ButtonSpinner className="text-primary-foreground"/>
                        Verifying...
                    </>
                ) : (
                    "Continue"
                )}
            </Button>
        </form>
    );
}
