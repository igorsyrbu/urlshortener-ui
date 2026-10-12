import {act, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import ExchangePage from "./page";
import {API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS, AUTH_REDIRECT_DELAY_MS, ROUTES} from "@/lib/constants";
import {useAuthStore} from "@/lib/store/auth";

const navigation = vi.hoisted(() => {
    const push = vi.fn();
    return {searchParams: new URLSearchParams(), push, router: {push}};
});

vi.mock("next/navigation", () => ({
    useSearchParams: () => navigation.searchParams,
    useRouter: () => navigation.router,
}));

async function openWithQuery(query: string): Promise<void> {
    navigation.searchParams = new URLSearchParams(query);
    await act(async () => {
        render(<ExchangePage/>);
    });
}

describe("auth code exchange page", () => {
    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true});
    });

    afterEach(() => {
        vi.useRealTimers();
        useAuthStore.setState({accessToken: null, user: null});
    });

    it("shows an error and calls nothing when the code is missing", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await openWithQuery("");

        expect(screen.getByText("No authorization code provided")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("exchanges the encoded code with credentials", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({accessToken: "jwt"}));
        vi.stubGlobal("fetch", fetchMock);

        await openWithQuery("code=a%26b%3Dc");

        expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
            `${API_BASE_URL}${API_ENDPOINTS.AUTH_CODE_EXCHANGE}?code=a%26b%3Dc`,
            {credentials: "include"},
        );
    });

    it("stores the access token and redirects to links after a short delay", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({accessToken: "jwt"})));
        await openWithQuery("code=abc");

        expect(useAuthStore.getState().accessToken).toBe("jwt");
        expect(navigation.push).not.toHaveBeenCalled();
        act(() => {
            vi.advanceTimersByTime(AUTH_REDIRECT_DELAY_MS);
        });

        expect(navigation.push).toHaveBeenCalledExactlyOnceWith(ROUTES.LINKS);
    });

    it("shows the failing status and does not redirect when the exchange is rejected", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 401, statusText: "Unauthorized"})));
        await openWithQuery("code=abc");

        expect(await screen.findByText("Exchange failed: 401 Unauthorized")).toBeInTheDocument();
        act(() => {
            vi.advanceTimersByTime(AUTH_REDIRECT_DELAY_MS);
        });
        expect(navigation.push).not.toHaveBeenCalled();
        expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it("shows the network error when the request cannot be made", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        await openWithQuery("code=abc");

        expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
    });
});
