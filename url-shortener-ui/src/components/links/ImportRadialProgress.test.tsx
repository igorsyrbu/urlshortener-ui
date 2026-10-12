import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {ImportRadialProgress} from "@/components/links/ImportRadialProgress";

describe("import radial progress", () => {
    it("shows the percentage and exposes accessible progress values", () => {
        render(<ImportRadialProgress processedRows={3} totalRows={10}/>);
        expect(screen.getByText("30%")).toBeInTheDocument();
        const indicator = screen.getByRole("progressbar", {name: "Import progress"});
        expect(indicator).toHaveAttribute("aria-valuenow", "3");
        expect(indicator).toHaveAttribute("aria-valuemax", "10");
        expect(indicator).toHaveAttribute("aria-valuetext", "3 of 10 rows processed");
        expect(screen.getByTitle("3 of 10 rows processed")).toBeInTheDocument();
    });

    it("handles unknown totals without breaking layout", () => {
        render(<ImportRadialProgress processedRows={0} totalRows={0}/>);
        expect(screen.getByText("0%")).toBeInTheDocument();
        expect(screen.getByRole("progressbar", {name: "Import progress"})).toHaveAttribute("aria-valuemax", "1");
    });

    it("uses theme tokens for the track and progress ring", () => {
        const {container} = render(<ImportRadialProgress processedRows={5} totalRows={10}/>);
        const rings = container.querySelectorAll("circle");
        expect(rings).toHaveLength(2);
        expect(rings[0]).toHaveClass("text-muted");
        expect(rings[1]).toHaveClass("text-primary");
        expect(rings[1]).toHaveAttribute("stroke-width", "4");
    });

    it("opens the import progress modal when pressed", () => {
        const handlePress = vi.fn();
        render(<ImportRadialProgress processedRows={5} totalRows={10} onPress={handlePress}/>);
        fireEvent.click(screen.getByRole("button", {name: "View import progress"}));
        expect(handlePress).toHaveBeenCalledOnce();
        expect(screen.getByRole("progressbar", {name: "Import progress"})).toBeInTheDocument();
    });
});
