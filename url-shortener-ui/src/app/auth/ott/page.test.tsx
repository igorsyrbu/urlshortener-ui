import {render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import OttPage from "./page";
import {API_BASE_URL} from "@/lib/api";

const navigation = vi.hoisted(() => ({searchParams: new URLSearchParams()}));

vi.mock("next/navigation", () => ({useSearchParams: () => navigation.searchParams}));

function renderWithQuery(query: string): HTMLElement {
    navigation.searchParams = new URLSearchParams(query);
    return render(<OttPage/>).container;
}

describe("OTT page", () => {
    it("posts the token and email from the magic link to the OTT login endpoint", () => {
        const container = renderWithQuery("token=abc&email=user%40example.com");

        const form = container.querySelector("form");
        expect(form).toHaveAttribute("action", `${API_BASE_URL}/ott/login`);
        expect(Object.fromEntries(new FormData(form as HTMLFormElement))).toEqual({
            loginType: "token",
            token: "abc",
            email: "user@example.com",
        });
        expect(screen.getByText("Verifying...")).toBeInTheDocument();
    });

    it.each(["email=user%40example.com", "token=abc", ""])("rejects the incomplete magic link '%s'", (query) => {
        const container = renderWithQuery(query);

        expect(screen.getByText("Invalid or incomplete magic link")).toBeInTheDocument();
        expect(container.querySelector("form")).toBeNull();
    });
});
