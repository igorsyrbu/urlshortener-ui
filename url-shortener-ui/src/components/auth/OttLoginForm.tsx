"use client";

import {useEffect, useRef} from "react";
import {API_BASE_URL} from "@/lib/api";

export type OttLoginType = "token" | "otp";

interface OttLoginFormProps {
    loginType: OttLoginType;
    token?: string;
    email?: string;
    code?: string;
}

function canSubmit(loginType: OttLoginType, token?: string, email?: string, code?: string): boolean {
    if (loginType === "token") {
        return Boolean(token && email);
    }
    return Boolean(email && code);
}

function submitForm(form: HTMLFormElement): void {
    if (typeof form.requestSubmit === "function") {
        form.requestSubmit();
        return;
    }

    const submitButton = form.querySelector("button[type='submit']") as HTMLButtonElement | null;
    if (submitButton) {
        submitButton.click();
        return;
    }

    form.submit();
}

export function OttLoginForm({loginType, token, email, code}: OttLoginFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const submittedRef = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (submittedRef.current) {
            return;
        }

        if (!canSubmit(loginType, token, email, code) || !formRef.current) {
            return;
        }

        const form = formRef.current;
        submittedRef.current = true;

        timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            submitForm(form);
        }, 0);

        return () => {
            if (timeoutRef.current !== null) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
                submittedRef.current = false;
            }
        };
    }, [loginType, token, email, code]);

    return (
        <form
            action={`${API_BASE_URL}/ott/login`}
            method="POST"
            ref={formRef}
            className="hidden"
        >
            <input type="hidden" name="loginType" value={loginType}/>
            {token && <input type="hidden" name="token" value={token}/>}
            {email && <input type="hidden" name="email" value={email}/>}
            {code && <input type="hidden" name="code" value={code}/>}
            <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1}/>
        </form>
    );
}
