import {StrictMode} from "react";
import {act, render, screen, waitFor} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import ExchangePage, {REJECTED_CODE_MESSAGE} from "./page";
import {API_BASE_URL} from "@/lib/api";
import {API_ENDPOINTS, ROUTES} from "@/lib/constants";
import {ERROR_COPY} from "@/lib/errors";
import {hasSessionHint} from "@/lib/session-hint";
import {useAuthStore} from "@/lib/store/auth";

const navigation = vi.hoisted(() => {
    const push = vi.fn();
    const replace = vi.fn();
    return {searchParams: new URLSearchParams(), push, replace, router: {push, replace}};
});

vi.mock("next/navigation", () => ({
    useSearchParams: () => navigation.searchParams,
    useRouter: () => navigation.router,
}));

async function openWithQuery(query: string): Promise<void> {
    navigation.searchParams = new URLSearchParams(query);
    window.history.pushState(null, "", `/auth/exchange?${query}`);
    await act(async () => {
        render(<ExchangePage/>);
    });
}

describe("auth code exchange page", () => {
    afterEach(() => {
        useAuthStore.setState({accessToken: null, user: null});
        window.history.replaceState(null, "", "/");
    });

    it("shows an error and calls nothing when the code is missing", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);

        await openWithQuery("");

        expect(screen.getByText("No authorization code provided")).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("exchanges the code only once under StrictMode's double effect run", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({accessToken: "jwt"}));
        vi.stubGlobal("fetch", fetchMock);
        navigation.searchParams = new URLSearchParams("code=abc");

        await act(async () => {
            render(<StrictMode><ExchangePage/></StrictMode>);
        });

        expect(fetchMock).toHaveBeenCalledOnce();
        expect(screen.queryByText("Exchange Failed")).not.toBeInTheDocument();
    });

    it("does not exchange the same code again when the router identity changes", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json({accessToken: "jwt"}));
        vi.stubGlobal("fetch", fetchMock);
        navigation.searchParams = new URLSearchParams("code=abc");
        const {rerender} = render(<ExchangePage/>);

        navigation.router = {push: navigation.push, replace: navigation.replace};
        await act(async () => {
            rerender(<ExchangePage/>);
        });

        expect(fetchMock).toHaveBeenCalledOnce();
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

    it("stores the access token and goes to links at once, replacing this page in history", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({accessToken: "jwt"})));

        await openWithQuery("code=abc");

        expect(useAuthStore.getState().accessToken).toBe("jwt");
        await waitFor(() => expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(ROUTES.LINKS));
        expect(navigation.push).not.toHaveBeenCalled();
    });

    it("remembers the session so the dashboard renders its shell at once", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({accessToken: "jwt"})));

        await openWithQuery("code=abc");

        expect(hasSessionHint()).toBe(true);
    });

    it("says the sign-in link is spent, without the status code, and does not redirect when the exchange is rejected", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {status: 401, statusText: "Unauthorized"})));
        await openWithQuery("code=abc");

        expect(await screen.findByText(REJECTED_CODE_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByText(/401|Unauthorized/)).not.toBeInTheDocument();
        expect(navigation.replace).not.toHaveBeenCalled();
        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(hasSessionHint()).toBe(false);
    });

    it("removes the single-use code from the address bar before exchanging it", async () => {
        let searchWhenRequested: string | null = null;
        vi.stubGlobal("fetch", vi.fn(async () => {
            searchWhenRequested = window.location.search;
            return Response.json({accessToken: "jwt"});
        }));

        await openWithQuery("code=abc");

        expect(searchWhenRequested).toBe("");
        expect(window.location.pathname).toBe("/auth/exchange");
    });

    it("keeps the code it was opened with after the search params lose it", async () => {
        const fetchMock = vi.fn(() => new Promise<Response>(() => {}));
        vi.stubGlobal("fetch", fetchMock);
        navigation.searchParams = new URLSearchParams("code=abc");
        const {rerender} = render(<ExchangePage/>);

        navigation.searchParams = new URLSearchParams();
        await act(async () => {
            rerender(<ExchangePage/>);
        });

        expect(screen.queryByText("No authorization code provided")).not.toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("shows the network error when the request cannot be made", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        await openWithQuery("code=abc");

        expect(await screen.findByText(ERROR_COPY.NETWORK)).toBeInTheDocument();
    });
});
