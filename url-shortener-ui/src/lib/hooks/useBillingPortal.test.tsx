import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {BILLING_COPY} from "@/lib/billing-constants";
import {PORTAL_RETURN_STORAGE_KEY} from "@/lib/billing-portal-return";
import {useBillingPortal} from "@/lib/hooks/useBillingPortal";
import {logger} from "@/lib/logger";
import {allowTestBillingOrigins, createFakeBillingTab, TEST_BILLING_ORIGINS, type FakeBillingTab} from "@/test/billing-utils";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));

const PORTAL_URL = `${TEST_BILLING_ORIGINS[1]}/portal/test`;
const HTTP_INTERNAL_SERVER_ERROR = 500;

function openFakeTab(): FakeBillingTab {
    const fakeTab = createFakeBillingTab();
    vi.spyOn(window, "open").mockReturnValue(fakeTab.tab);
    return fakeTab;
}

describe("useBillingPortal", () => {
    beforeEach(() => {
        allowTestBillingOrigins();
        vi.mocked(fetchWithAuth).mockResolvedValue(Response.json({url: PORTAL_URL}));
    });

    it("opens the tab before the portal request resolves", () => {
        const {tab} = openFakeTab();
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>(() => {}));
        const {result} = renderHook(() => useBillingPortal());

        act(() => {
            void result.current.handleManage();
        });

        expect(window.open).toHaveBeenCalledOnce();
        expect(tab.document.title).toBe(BILLING_COPY.MANAGING_SUBSCRIPTION);
        expect(result.current.isManaging).toBe(true);
    });

    it("sends the opened tab to the portal and remembers that the portal was opened", async () => {
        const {replaceLocation} = openFakeTab();
        const {result} = renderHook(() => useBillingPortal());

        await act(() => result.current.handleManage());

        expect(replaceLocation).toHaveBeenCalledExactlyOnceWith(PORTAL_URL);
        expect(sessionStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).not.toBeNull();
        expect(result.current.isManaging).toBe(false);
    });

    it("closes the empty tab and shows the error when the portal request fails", async () => {
        const {close, replaceLocation} = openFakeTab();
        vi.mocked(fetchWithAuth).mockResolvedValue(new Response(null, {status: HTTP_INTERNAL_SERVER_ERROR}));
        const {result} = renderHook(() => useBillingPortal());

        await act(() => result.current.handleManage());

        expect(close).toHaveBeenCalledOnce();
        expect(replaceLocation).not.toHaveBeenCalled();
        expect(result.current.errorMessage).toBe(BILLING_COPY.PORTAL_FAILED);
        expect(logger.error).toHaveBeenCalledWith(BILLING_COPY.PORTAL_LOG_ERROR, expect.anything());
    });

    it("opens the portal in the current tab when the browser blocks the new tab", async () => {
        vi.spyOn(window, "open").mockReturnValue(null);
        const assign = vi.fn();
        vi.stubGlobal("location", {...window.location, assign});
        const {result} = renderHook(() => useBillingPortal());

        await act(() => result.current.handleManage());

        expect(assign).toHaveBeenCalledExactlyOnceWith(PORTAL_URL);
        expect(result.current.errorMessage).toBeNull();
    });

    it("closes the empty tab and remembers nothing when the portal URL arrives after the page unmounted", async () => {
        const {close, replaceLocation} = openFakeTab();
        let respond = (_response: Response): void => undefined;
        vi.mocked(fetchWithAuth).mockReturnValue(new Promise<Response>((resolve) => { respond = resolve; }));
        const {result, unmount} = renderHook(() => useBillingPortal());

        let pending: Promise<void> = Promise.resolve();
        act(() => { pending = result.current.handleManage(); });
        unmount();
        await act(async () => {
            respond(Response.json({url: PORTAL_URL}));
            await pending;
        });

        expect(replaceLocation).not.toHaveBeenCalled();
        expect(close).toHaveBeenCalledOnce();
        expect(sessionStorage.getItem(PORTAL_RETURN_STORAGE_KEY)).toBeNull();
        expect(logger.error).not.toHaveBeenCalled();
    });
});
