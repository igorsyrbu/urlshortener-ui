"use client";

import {type SyntheticEvent, useCallback, useState} from "react";
import {AlertCircle} from "lucide-react";
import {TurnstileWidget} from "@/components/auth/TurnstileWidget";
import {LinkPasswordInput} from "@/components/links/LinkPasswordInput";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {FieldError} from "@/components/ui/field-error";
import {Label} from "@/components/ui/label";
import {CAPTCHA_VERIFYING_LABEL, UNLOCK_COPY} from "@/lib/constants";
import {useCooldown} from "@/lib/hooks/useCooldown";
import {attemptUnlock, type UnlockOutcome} from "@/lib/unlock-outcome";
import {focusElementById} from "@/lib/utils";

const UNLOCK_PASSWORD_FIELD_ID = "unlockPassword";
const UNLOCK_ERROR_ID = `${UNLOCK_PASSWORD_FIELD_ID}-error`;

interface UnlockLinkFormProps {
    linkKey: string;
    turnstileEnabled: boolean;
    turnstileSiteKey: string;
    /** The link turned out to be missing, archived or not protected. */
    onNotFound: () => void;
}

function readSubmitLabel(isPending: boolean, isRedirecting: boolean, isTurnstileVerifying: boolean): string {
    if (isRedirecting) return UNLOCK_COPY.REDIRECTING;
    if (isPending) return UNLOCK_COPY.SUBMITTING;
    return isTurnstileVerifying ? CAPTCHA_VERIFYING_LABEL : UNLOCK_COPY.SUBMIT;
}

/** Asks for a protected link's password and sends the visitor on; the destination is only known after the right password. */
export function UnlockLinkForm({linkKey, turnstileEnabled, turnstileSiteKey, onNotFound}: UnlockLinkFormProps) {
    const [password, setPassword] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [turnstileToken, setTurnstileToken] = useState("");
    // A new key remounts the widget, which is how Turnstile is reset for a fresh token.
    const [turnstileGeneration, setTurnstileGeneration] = useState(0);
    const [isPending, setIsPending] = useState(false);
    const [isRedirecting, setIsRedirecting] = useState(false);
    const {isCoolingDown, startCooldown} = useCooldown();

    const handleTurnstileSuccess = useCallback((token: string) => setTurnstileToken(token), []);
    const handleTurnstileExpire = useCallback(() => setTurnstileToken(""), []);
    const handleTurnstileError = useCallback(() => setErrorMessage(UNLOCK_COPY.CAPTCHA_FAILED), []);

    const resetCaptcha = (): void => {
        setTurnstileToken("");
        setTurnstileGeneration((generation) => generation + 1);
    };

    const applyOutcome = (outcome: UnlockOutcome): void => {
        if (outcome.kind === "unlocked") {
            setIsRedirecting(true);
            window.location.assign(outcome.longUrl);
            return;
        }
        if (outcome.kind === "not-found") {
            onNotFound();
            return;
        }
        setErrorMessage(outcome.message);
        if (outcome.kind === "rate-limited") startCooldown(outcome.cooldownSeconds);
        if (outcome.kind === "rejected") {
            setPassword("");
            if (outcome.shouldResetCaptcha && turnstileEnabled) resetCaptcha();
            focusElementById(UNLOCK_PASSWORD_FIELD_ID);
        }
    };

    const handleSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
        e.preventDefault();
        setErrorMessage(null);
        if (!password.trim()) {
            setErrorMessage(UNLOCK_COPY.PASSWORD_REQUIRED);
            focusElementById(UNLOCK_PASSWORD_FIELD_ID);
            return;
        }
        setIsPending(true);
        const captchaToken = turnstileEnabled ? turnstileToken : null;
        const outcome = await attemptUnlock({key: linkKey, password, captchaToken, queryString: window.location.search});
        setIsPending(false);
        applyOutcome(outcome);
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        if (errorMessage === UNLOCK_COPY.PASSWORD_REQUIRED) setErrorMessage(null);
    };

    const isTurnstileVerifying = turnstileEnabled && !turnstileToken;
    const isBusy = isPending || isRedirecting;

    return (
        <div className="flex flex-col gap-3">
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <Label htmlFor={UNLOCK_PASSWORD_FIELD_ID} className="sr-only">{UNLOCK_COPY.PASSWORD_LABEL}</Label>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <LinkPasswordInput
                        inputId={UNLOCK_PASSWORD_FIELD_ID}
                        value={password}
                        onChange={handlePasswordChange}
                        hasError={errorMessage !== null}
                        errorId={UNLOCK_ERROR_ID}
                        disabled={isBusy}
                        autoComplete="current-password"
                        className="min-w-0 flex-1"
                    />
                    <Button type="submit" disabled={isBusy || isCoolingDown || isTurnstileVerifying}>
                        {isBusy ? <ButtonSpinner/> : null}
                        {readSubmitLabel(isPending, isRedirecting, isTurnstileVerifying)}
                    </Button>
                </div>
                {errorMessage ? (
                    <FieldError id={UNLOCK_ERROR_ID} className="flex items-center gap-1">
                        <AlertCircle className="size-3.5 shrink-0"/>
                        {errorMessage}
                    </FieldError>
                ) : null}
            </form>
            {turnstileEnabled ? (
                <TurnstileWidget
                    key={turnstileGeneration}
                    siteKey={turnstileSiteKey}
                    onSuccess={handleTurnstileSuccess}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                />
            ) : null}
        </div>
    );
}
