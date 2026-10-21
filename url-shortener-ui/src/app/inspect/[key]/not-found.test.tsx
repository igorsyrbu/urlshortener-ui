import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import LinkNotFound from "./not-found";

describe("inspect not-found page", () => {
    it("says the short link does not exist and offers the home page", () => {
        render(<LinkNotFound/>);

        expect(screen.getByRole("heading", {name: "Link not found"})).toBeInTheDocument();
        expect(screen.getByText("404")).toBeInTheDocument();
        expect(screen.getByRole("link", {name: "Go to Short Links"})).toHaveAttribute("href", "/");
    });
});
