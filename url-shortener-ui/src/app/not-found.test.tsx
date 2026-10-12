import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import NotFoundPage from "./not-found";

const navigation = vi.hoisted(() => {
    const router = {push: vi.fn(), back: vi.fn()};
    return {router};
});

vi.mock("next/navigation", () => ({useRouter: () => navigation.router}));

describe("not found page", () => {
    it("explains that the page does not exist", () => {
        render(<NotFoundPage/>);

        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.getByText("Page not found")).toBeInTheDocument();
    });

    it("goes back to the previous page", async () => {
        const user = userEvent.setup();
        render(<NotFoundPage/>);

        await user.click(screen.getByRole("button", {name: "Go back"}));

        expect(navigation.router.back).toHaveBeenCalledOnce();
    });

    it("goes to the dashboard", async () => {
        const user = userEvent.setup();
        render(<NotFoundPage/>);

        await user.click(screen.getByRole("button", {name: "Go to Dashboard"}));

        expect(navigation.router.push).toHaveBeenCalledExactlyOnceWith("/dashboard");
    });
});
