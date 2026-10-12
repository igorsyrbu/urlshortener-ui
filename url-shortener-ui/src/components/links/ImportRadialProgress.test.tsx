import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {ImportRadialProgress} from "@/components/links/ImportRadialProgress";
import {IMPORT_PROGRESS_ARIA_LABEL, VIEW_IMPORT_PROGRESS_LABEL} from "@/components/links/import-export-constants";

describe("import radial progress", () => {
    it("shows the percentage and exposes accessible progress values", () => {
        render(<ImportRadialProgress processedRows={3} totalRows={10}/>);

        expect(screen.getByText("30%")).toBeInTheDocument();
        const indicator = screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL});
        expect(indicator).toHaveAttribute("aria-valuenow", "3");
        expect(indicator).toHaveAttribute("aria-valuemax", "10");
        expect(indicator).toHaveAttribute("aria-valuetext", "3 of 10 rows processed");
        expect(screen.getByTitle("3 of 10 rows processed")).toBeInTheDocument();
    });

    it("handles unknown totals without breaking layout", () => {
        render(<ImportRadialProgress processedRows={0} totalRows={0}/>);

        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL})).toHaveAttribute("aria-valuemax", "1");
    });

    it("never exceeds 100% when more rows are processed than expected", () => {
        render(<ImportRadialProgress processedRows={12} totalRows={10}/>);

        expect(screen.getByText("100%")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL})).toHaveAttribute("aria-valuenow", "10");
    });

    it("rounds the percentage down", () => {
        render(<ImportRadialProgress processedRows={2} totalRows={3}/>);

        expect(screen.getByText("66%")).toBeInTheDocument();
    });

    it("is not interactive without a press handler", () => {
        render(<ImportRadialProgress processedRows={5} totalRows={10}/>);

        expect(screen.queryByRole("button", {name: VIEW_IMPORT_PROGRESS_LABEL})).not.toBeInTheDocument();
    });

    it("opens the import progress modal when pressed", async () => {
        const user = userEvent.setup();
        const handlePress = vi.fn();
        render(<ImportRadialProgress processedRows={5} totalRows={10} onPress={handlePress}/>);

        await user.click(screen.getByRole("button", {name: VIEW_IMPORT_PROGRESS_LABEL}));

        expect(handlePress).toHaveBeenCalledOnce();
        expect(screen.getByRole("progressbar", {name: IMPORT_PROGRESS_ARIA_LABEL})).toBeInTheDocument();
    });
});
