import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {
    BILLING_PERIOD_BY_CYCLE,
    RATE_LIMIT_RETRY_AFTER_HEADER,
    toBillingSubscription,
    type BillingCycle,
    type BillingPeriodUpgradeResponse,
    type BillingSubscription,
    type BillingSubscriptionDto,
} from "@/lib/billing-constants";
import {parseBillingUrl} from "@/lib/billing-redirect";
import {parseRetryAfterSeconds} from "@/lib/retry-after";

export const HTTP_BAD_REQUEST = 400;
export const HTTP_UNAUTHORIZED = 401;
export const HTTP_NOT_FOUND = 404;
export const HTTP_CONFLICT = 409;
export const HTTP_UNPROCESSABLE_ENTITY = 422;
export const HTTP_TOO_MANY_REQUESTS = 429;

export class BillingApiError extends Error {
    readonly status: number;
    readonly retryAfterSeconds: number | null;

    constructor(status: number, message: string, retryAfterSeconds: number | null = null) {
        super(message);
        this.name = "BillingApiError";
        this.status = status;
        this.retryAfterSeconds = retryAfterSeconds;
    }
}

/** A 401 means `fetchWithAuth` is already sending the user to sign in: callers show and log nothing for it. */
export function isUnauthorizedBillingError(error: unknown): boolean {
    return error instanceof BillingApiError && error.status === HTTP_UNAUTHORIZED;
}

interface BillingUrlPayload {
    url: string;
}

function throwBillingError(response: Response, fallbackMessage: string): never {
    throw new BillingApiError(response.status, fallbackMessage, parseRetryAfterSeconds(response.headers, RATE_LIMIT_RETRY_AFTER_HEADER));
}

function parseBillingUrlPayload(payload: unknown): string {
    if (typeof payload !== "object" || payload === null) throw new Error("Invalid billing URL payload");
    const url = (payload as Partial<BillingUrlPayload>).url;
    if (typeof url !== "string" || url.length === 0) throw new Error("Invalid billing URL payload");
    return parseBillingUrl(url).href;
}

function parsePeriodUpgradePayload(payload: unknown): BillingPeriodUpgradeResponse {
    if (typeof payload !== "object" || payload === null) throw new Error("Invalid period upgrade payload");
    const status = (payload as Partial<BillingPeriodUpgradeResponse>).status;
    if (status !== "scheduled") throw new Error("Invalid period upgrade payload");
    const effectiveDate = (payload as Partial<BillingPeriodUpgradeResponse>).effectiveDate;
    if (effectiveDate !== undefined && typeof effectiveDate !== "string") throw new Error("Invalid period upgrade payload");
    return effectiveDate === undefined ? {status} : {status, effectiveDate};
}

export async function getBillingSubscription(): Promise<BillingSubscription> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_SUBSCRIPTION);
    if (!response.ok) throwBillingError(response, `Failed to load subscription: ${response.status}`);
    const dto: BillingSubscriptionDto = await response.json();
    return toBillingSubscription(dto);
}

export async function createBillingCheckoutUrl(cycle: BillingCycle, signal?: AbortSignal): Promise<string> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_CHECKOUT, {
        method: "POST",
        body: JSON.stringify({billingPeriod: BILLING_PERIOD_BY_CYCLE[cycle]}),
        signal,
    });
    if (!response.ok) throwBillingError(response, `Failed to start checkout: ${response.status}`);
    return parseBillingUrlPayload(await response.json());
}

/** The portal's session lifetime (`expiresInSeconds`) is not read: the return refresh does not depend on it. */
export async function createBillingPortalUrl(signal?: AbortSignal): Promise<string> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_PORTAL, {method: "POST", signal});
    if (!response.ok) throwBillingError(response, `Failed to open portal: ${response.status}`);
    return parseBillingUrlPayload(await response.json());
}

export async function scheduleBillingPeriodUpgrade(signal?: AbortSignal): Promise<BillingPeriodUpgradeResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, {method: "POST", signal});
    if (!response.ok) throwBillingError(response, `Failed to switch billing period: ${response.status}`);
    return parsePeriodUpgradePayload(await response.json());
}
