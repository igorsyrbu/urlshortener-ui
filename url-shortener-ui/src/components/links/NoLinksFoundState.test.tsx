import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {NoLinksFoundState} from "@/components/links/NoLinksFoundState";

describe("NoLinksFoundState", () => {
    it("tells the user the search matched nothing", () => {
        render(<NoLinksFoundState/>);

        expect(screen.getByText("No links found")).toBeInTheDocument();
        expect(screen.getByText(/Try adjusting your search/)).toBeInTheDocument();
    });
});
