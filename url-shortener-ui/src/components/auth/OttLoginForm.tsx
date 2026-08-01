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

export function OttLoginForm({loginType, token, email, code}: OttLoginFormProps) {
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (canSubmit(loginType, token, email, code) && formRef.current) {
            formRef.current.submit();
        }
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
        </form>
    );
}
