"use client";

import {Turnstile} from "@marsidev/react-turnstile";

interface TurnstileWidgetProps {
    siteKey: string;
    onSuccess: (token: string) => void;
    onError?: (errorCode: string) => void;
    onExpire?: () => void;
}

export function TurnstileWidget({siteKey, onSuccess, onError, onExpire}: TurnstileWidgetProps) {
    return (
        <Turnstile
            siteKey={siteKey}
            options={{
                appearance: "interaction-only",
                size: "flexible",
                retry: "auto",
                refreshExpired: "auto",
                refreshTimeout: "auto",
            }}
            onSuccess={onSuccess}
            onError={onError}
            onExpire={onExpire}
        />
    );
}
