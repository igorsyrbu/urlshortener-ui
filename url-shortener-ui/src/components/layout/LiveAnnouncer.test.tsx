import {act, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";
import {LiveAnnouncer} from "@/components/layout/LiveAnnouncer";
import {announce, useAnnouncerStore} from "@/lib/store/announcer";

const initialState = useAnnouncerStore.getInitialState();

describe("LiveAnnouncer", () => {
    afterEach(() => {
        useAnnouncerStore.setState(initialState, true);
    });

    it("renders an empty polite live region", () => {
        render(<LiveAnnouncer/>);

        expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
        expect(screen.getByRole("status").textContent).toBe("");
    });

    it("reads out an announcement", () => {
        render(<LiveAnnouncer/>);

        act(() => announce("Copied to clipboard"));

        expect(screen.getByRole("status")).toHaveTextContent("Copied to clipboard");
    });

    it("re-renders the text when the same message is announced again", () => {
        render(<LiveAnnouncer/>);
        act(() => announce("Copied to clipboard"));
        const firstNode = screen.getByText("Copied to clipboard");

        act(() => announce("Copied to clipboard"));

        expect(screen.getByText("Copied to clipboard")).not.toBe(firstNode);
    });
});
