"use client";

import {useState} from "react";
import {
    BillingApiError,
    HTTP_NOT_FOUND,
    HTTP_TOO_MANY_REQUESTS,
    createBillingPortalUrl,
} from "@/lib/billing-api";
import {BILLING_COPY, buildRateLimitedMessage} from "@/lib/billing-constants";
import {markPortalOpened} from "@/lib/billing-portal-return";
import {logger} from "@/lib/logger";
import {openBillingUrlInNewTab} from "@/lib/billing-redirect";

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

export function useBillingPortal(): BillingPortalState {
    const [isManaging, setIsManaging] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function handleManage(): Promise<void> {
        if (isManaging) return;
        setIsManaging(true);
        setErrorMessage(null);
        try {
            const portal = await createBillingPortalUrl();
            markPortalOpened(portal.expiresInSeconds);
            openBillingUrlInNewTab(portal.url);
            setIsManaging(false);
        } catch (error) {
            logger.error(BILLING_COPY.PORTAL_LOG_ERROR, error);
            setErrorMessage(resolvePortalErrorMessage(error));
            setIsManaging(false);
        }
    }

    return {isManaging, errorMessage, handleManage};
}
