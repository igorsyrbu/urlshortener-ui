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

export const HTTP_BAD_REQUEST = 400;
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

interface BillingUrlPayload {
    url: string;
}

export interface BillingPortalResult {
    url: string;
    expiresInSeconds: number | null;
}

function readRetryAfterSeconds(response: Response): number | null {
    const raw = response.headers.get(RATE_LIMIT_RETRY_AFTER_HEADER);
    if (raw === null) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isNaN(parsed) ? null : parsed;
}

function throwBillingError(response: Response, fallbackMessage: string): never {
    throw new BillingApiError(response.status, fallbackMessage, readRetryAfterSeconds(response));
}

function parseBillingUrlPayload(payload: unknown): string {
    if (typeof payload !== "object" || payload === null) throw new Error("Invalid billing URL payload");
    const url = (payload as Partial<BillingUrlPayload>).url;
    if (typeof url !== "string" || url.length === 0) throw new Error("Invalid billing URL payload");
    return url;
}

function parseBillingPortalPayload(payload: unknown): BillingPortalResult {
    const url = parseBillingUrlPayload(payload);
    const expiresInSeconds = (payload as Partial<BillingPortalResult>).expiresInSeconds;
    if (
        expiresInSeconds === undefined ||
        expiresInSeconds === null ||
        !Number.isSafeInteger(expiresInSeconds) ||
        expiresInSeconds < 0
    ) {
        return {url, expiresInSeconds: null};
    }
    return {url, expiresInSeconds};
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

export async function createBillingCheckoutUrl(cycle: BillingCycle): Promise<string> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_CHECKOUT, {
        method: "POST",
        body: JSON.stringify({billingPeriod: BILLING_PERIOD_BY_CYCLE[cycle]}),
    });
    if (!response.ok) throwBillingError(response, `Failed to start checkout: ${response.status}`);
    return parseBillingUrlPayload(await response.json());
}

export async function createBillingPortalUrl(): Promise<BillingPortalResult> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_PORTAL, {method: "POST"});
    if (!response.ok) throwBillingError(response, `Failed to open portal: ${response.status}`);
    return parseBillingPortalPayload(await response.json());
}

export async function scheduleBillingPeriodUpgrade(): Promise<BillingPeriodUpgradeResponse> {
    const response = await fetchWithAuth(API_ENDPOINTS.BILLING_SUBSCRIPTION_UPGRADE, {method: "POST"});
    if (!response.ok) throwBillingError(response, `Failed to switch billing period: ${response.status}`);
    return parsePeriodUpgradePayload(await response.json());
}
