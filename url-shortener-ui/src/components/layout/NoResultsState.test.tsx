import {render, screen} from "@testing-library/react";
import {Tag} from "lucide-react";
import {describe, expect, it} from "vitest";
import {NoResultsState} from "@/components/layout/NoResultsState";

describe("NoResultsState", () => {
    it("shows the title and the subtitle", () => {
        render(
            <NoResultsState icon={Tag} title="Nothing here" subtitle="Try another search" itemHeightClass="h-10"
                            pillWidthClass="w-16"/>,
        );

        expect(screen.getByRole("heading", {name: "Nothing here"})).toBeInTheDocument();
        expect(screen.getByText("Try another search")).toBeInTheDocument();
    });
});
