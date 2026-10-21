import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {InspectLinkPreviewCard} from "@/components/inspect/InspectLinkPreviewCard";

const LONG_URL = "https://www.example.com/articles/42?utm_source=mail";

describe("InspectLinkPreviewCard", () => {
    it("shows the title, the description and the destination domain", () => {
        render(<InspectLinkPreviewCard title="Great article" description="A short summary" longUrl={LONG_URL}/>);

        expect(screen.getByRole("heading", {name: "Great article"})).toBeInTheDocument();
        expect(screen.getByText("A short summary")).toBeInTheDocument();
        expect(screen.getByText("www.example.com")).toBeInTheDocument();
    });

    it.each([undefined, null, ""])("omits the description when it is %s", (description) => {
        render(<InspectLinkPreviewCard title="Great article" description={description} longUrl={LONG_URL}/>);

        expect(screen.queryByText("A short summary")).not.toBeInTheDocument();
    });

    it("falls back to the raw destination when it is not a valid URL", () => {
        render(<InspectLinkPreviewCard title="Great article" longUrl="not a url"/>);

        expect(screen.getByText("not a url")).toBeInTheDocument();
    });

    it("exposes a very long title as a tooltip so it can be truncated", () => {
        const longTitle = "t".repeat(300);

        render(<InspectLinkPreviewCard title={longTitle} longUrl={LONG_URL}/>);

        expect(screen.getByRole("heading", {name: longTitle})).toHaveAttribute("title", longTitle);
    });

    it("exposes a very long description and destination as tooltips", () => {
        const long = "x".repeat(300);
        const destination = `https://${long}.example.com/a`;

        render(<InspectLinkPreviewCard title="Great article" description={long} longUrl={destination}/>);

        expect(screen.getByText(long)).toHaveAttribute("title", long);
        expect(screen.getByText(`${long}.example.com`)).toHaveAttribute("title", `${long}.example.com`);
    });

    it("shows the unavailable placeholder without an image", () => {
        render(<InspectLinkPreviewCard title="Great article" ogImageUrl={null} longUrl={LONG_URL}/>);

        expect(screen.getByText("Preview unavailable")).toBeInTheDocument();
    });
});
