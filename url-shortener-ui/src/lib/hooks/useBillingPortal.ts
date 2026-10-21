"use client";

import {useState} from "react";
import {
    BillingApiError,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    createBillingPortalUrl,
    isUnauthorizedBillingError,
} from "@/lib/billing-api";
import {BILLING_COPY, buildRateLimitedMessage} from "@/lib/billing-constants";
import {markPortalOpened} from "@/lib/billing-portal-return";
import {logger} from "@/lib/logger";
import {openBlankBillingTab, showBillingUrlInTab} from "@/lib/billing-redirect";
import {useAbortOnUnmount} from "@/lib/hooks/useAbortOnUnmount";

export interface BillingPortalState {
    isManaging: boolean;
    errorMessage: string | null;
    handleManage: () => Promise<void>;
}

function resolvePortalErrorMessage(error: unknown): string {
    if (!(error instanceof BillingApiError)) return BILLING_COPY.PORTAL_FAILED;
    if (error.status === HTTP_NOT_FOUND) return BILLING_COPY.PORTAL_NO_HISTORY;
    if (error.status === HTTP_TOO_MANY_REQUESTS) {
        return buildRateLimitedMessage(BILLING_COPY.PORTAL_RATE_LIMITED, error.retryAfterSeconds);
    }
    return BILLING_COPY.PORTAL_FAILED;
}

/** `aborted` also covers a 401: the user is on the way to sign in, so there is nothing to report. */
type PortalOpenOutcome = {kind: "opened"} | {kind: "aborted"} | {kind: "failed"; error: unknown};

async function openPortalInTab(portalTab: Window | null, signal: AbortSignal): Promise<PortalOpenOutcome> {
    try {
        const portalUrl = await createBillingPortalUrl(signal);
        if (signal.aborted) return {kind: "aborted"};
        showBillingUrlInTab(portalTab, portalUrl);
        markPortalOpened();
        return {kind: "opened"};
    } catch (error) {
        return signal.aborted || isUnauthorizedBillingError(error) ? {kind: "aborted"} : {kind: "failed", error};
    }
}

export function useBillingPortal(): BillingPortalState {
    const [isManaging, setIsManaging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const startRequest = useAbortOnUnmount();

    async function handleManage(): Promise<void> {
        if (isManaging) return;
        // Opened before the request: once the click's user activation expires (about 1 s in Safari), the browser
        // blocks a new tab, and the portal request can take longer than that.
        const portalTab = openBlankBillingTab(BILLING_COPY.MANAGING_SUBSCRIPTION);
        setIsManaging(true);
        setErrorMessage(null);
        const outcome = await openPortalInTab(portalTab, startRequest());
        if (outcome.kind !== "opened") portalTab?.close();
        if (outcome.kind === "failed") {
            logger.error(BILLING_COPY.PORTAL_LOG_ERROR, outcome.error);
            setErrorMessage(resolvePortalErrorMessage(outcome.error));
        }
        setIsManaging(false);
    }

    return {isManaging, errorMessage, handleManage};
}
