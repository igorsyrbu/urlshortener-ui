import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import {CappedRows} from "@/components/analytics/CappedRows";
import {ANALYTICS_COPY, ANALYTICS_VISIBLE_ROWS, buildShowAllRowsLabel} from "@/lib/constants";

function createRows(count: number): string[] {
    return Array.from({length: count}, (_, index) => `row-${index + 1}`);
}

function renderRows(rows: string[]): void {
    render(
        <CappedRows rows={rows}>
            {(visibleRows) => <ul>{visibleRows.map((row) => <li key={row}>{row}</li>)}</ul>}
        </CappedRows>,
    );
}

describe("CappedRows", () => {
    it("shows every row and no button when the list fits", () => {
        renderRows(createRows(ANALYTICS_VISIBLE_ROWS));

        expect(screen.getAllByRole("listitem")).toHaveLength(ANALYTICS_VISIBLE_ROWS);
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("shows only the first rows of a longer list and offers the rest", () => {
        const rows = createRows(ANALYTICS_VISIBLE_ROWS + 5);

        renderRows(rows);

        expect(screen.getAllByRole("listitem")).toHaveLength(ANALYTICS_VISIBLE_ROWS);
        expect(screen.getByRole("button", {name: buildShowAllRowsLabel(rows.length)})).toHaveAttribute("aria-expanded", "false");
    });

    it("shows all rows on request and collapses them again", async () => {
        const user = userEvent.setup();
        const rows = createRows(ANALYTICS_VISIBLE_ROWS + 5);
        renderRows(rows);

        await user.click(screen.getByRole("button", {name: buildShowAllRowsLabel(rows.length)}));
        expect(screen.getAllByRole("listitem")).toHaveLength(rows.length);

        await user.click(screen.getByRole("button", {name: ANALYTICS_COPY.SHOW_FEWER}));
        expect(screen.getAllByRole("listitem")).toHaveLength(ANALYTICS_VISIBLE_ROWS);
    });
});
