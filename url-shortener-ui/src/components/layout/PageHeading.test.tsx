import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {PageHeading} from "@/components/layout/PageHeading";

describe("PageHeading", () => {
    it("renders its content as a heading", () => {
        render(<PageHeading>Links</PageHeading>);

        expect(screen.getByRole("heading", {name: "Links"})).toBeInTheDocument();
    });
});
