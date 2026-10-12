import {render, screen, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {OtherSessionsList} from "@/components/settings/OtherSessionsList";
import {createUserSession} from "@/test/user-session-utils";

const SESSIONS = [
    createUserSession({id: "s1", device: "iPhone", os: "iOS", city: "Paris", region: "", country: "France"}),
    createUserSession({id: "s2", device: "ThinkPad", os: "Linux"}),
];

function getRow(deviceText: string): HTMLElement {
    const row = screen.getByText(deviceText).closest<HTMLElement>("div.justify-between");
    if (!row) throw new Error(`Row for ${deviceText} not found`);
    return row;
}

describe("OtherSessionsList", () => {
    it("renders nothing when there are no other sessions", () => {
        const {container} = render(<OtherSessionsList sessions={[]} sessionActionLoading={null} onLogoutSession={vi.fn()}/>);

        expect(container).toBeEmptyDOMElement();
    });

    it("lists every session with its device and location", () => {
        render(<OtherSessionsList sessions={SESSIONS} sessionActionLoading={null} onLogoutSession={vi.fn()}/>);

        expect(screen.getByText("Active Sessions")).toBeInTheDocument();
        expect(screen.getByText("iPhone (iOS)")).toBeInTheDocument();
        expect(screen.getByText("Paris, France")).toBeInTheDocument();
        expect(screen.getByText("ThinkPad (Linux)")).toBeInTheDocument();
    });

    it("requests logout of the clicked session by id", async () => {
        const user = userEvent.setup();
        const onLogoutSession = vi.fn();
        render(<OtherSessionsList sessions={SESSIONS} sessionActionLoading={null} onLogoutSession={onLogoutSession}/>);

        await user.click(within(getRow("ThinkPad (Linux)")).getByRole("button", {name: "Log out"}));

        expect(onLogoutSession).toHaveBeenCalledExactlyOnceWith("s2");
    });

    it("shows progress on the session being logged out and disables every other action", () => {
        render(<OtherSessionsList sessions={SESSIONS} sessionActionLoading="s1" onLogoutSession={vi.fn()}/>);

        expect(within(getRow("iPhone (iOS)")).getByRole("button", {name: "Logging out..."})).toBeDisabled();
        expect(within(getRow("ThinkPad (Linux)")).getByRole("button", {name: "Log out"})).toBeDisabled();
    });

    it("disables every logout button while all other sessions are being terminated", () => {
        render(<OtherSessionsList sessions={SESSIONS} sessionActionLoading="other" onLogoutSession={vi.fn()}/>);

        screen.getAllByRole("button", {name: "Log out"}).forEach((button) => expect(button).toBeDisabled());
    });
});
