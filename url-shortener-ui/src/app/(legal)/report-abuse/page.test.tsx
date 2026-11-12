import {render, screen, within} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import ReportAbusePage from "./page";
import {APP_NAME, PAGE_TITLES, ROUTES} from "@/lib/constants";

vi.mock("@marsidev/react-turnstile", async () => (await import("@/test/turnstile-utils")).turnstileModuleMock);

async function renderReportAbusePage(): Promise<void> {
    render(await ReportAbusePage({searchParams: Promise.resolve({})}));
}

describe("report abuse page layout", () => {
    it("shows the report form inside the page's main landmark", async () => {
        await renderReportAbusePage();

        expect(within(screen.getByRole("main")).getByRole("heading", {name: PAGE_TITLES.REPORT_ABUSE})).toBeInTheDocument();
    });

    it("links back to the home page from its footer", async () => {
        await renderReportAbusePage();

        expect(within(screen.getByRole("contentinfo")).getByRole("link", {name: APP_NAME})).toHaveAttribute("href", ROUTES.HOME);
    });
});
