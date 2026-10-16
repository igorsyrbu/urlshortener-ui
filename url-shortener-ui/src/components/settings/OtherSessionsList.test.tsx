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

function renderList(overrides: Partial<Parameters<typeof OtherSessionsList>[0]> = {}): void {
    const props: Parameters<typeof OtherSessionsList>[0] = {
        sessions: SESSIONS,
        isLoading: false,
        sessionActionLoading: null,
        onLogoutSession: vi.fn(),
        ...overrides,
    };
    render(<OtherSessionsList {...props}/>);
}

describe("OtherSessionsList", () => {
    it("shows a loading skeleton while the sessions are loading", () => {
        renderList({sessions: [], isLoading: true});

        expect(screen.getByRole("status", {name: "Loading other sessions"})).toBeInTheDocument();
        expect(screen.getByText("Active Sessions")).toBeInTheDocument();
        expect(screen.queryByRole("button", {name: "Log out"})).not.toBeInTheDocument();
    });

    it("renders nothing when loading finished with no other sessions", () => {
        const {container} = render(<OtherSessionsList sessions={[]} isLoading={false} sessionActionLoading={null} onLogoutSession={vi.fn()}/>);

        expect(container).toBeEmptyDOMElement();
    });

    it("lists every session with its device and location", () => {
        renderList();

        expect(screen.getByText("Active Sessions")).toBeInTheDocument();
        expect(screen.getByText("iPhone (iOS)")).toBeInTheDocument();
        expect(screen.getByText("Paris, France")).toBeInTheDocument();
        expect(screen.getByText("ThinkPad (Linux)")).toBeInTheDocument();
    });

    it("requests logout of the clicked session by id", async () => {
        const user = userEvent.setup();
        const onLogoutSession = vi.fn();
        renderList({onLogoutSession});

        await user.click(within(getRow("ThinkPad (Linux)")).getByRole("button", {name: "Log out"}));

        expect(onLogoutSession).toHaveBeenCalledExactlyOnceWith("s2");
    });

    it("shows progress on the session being logged out and disables every other action", () => {
        renderList({sessionActionLoading: "s1"});

        expect(within(getRow("iPhone (iOS)")).getByRole("button", {name: "Logging out..."})).toBeDisabled();
        expect(within(getRow("ThinkPad (Linux)")).getByRole("button", {name: "Log out"})).toBeDisabled();
    });

    it("disables every logout button while all other sessions are being terminated", () => {
        renderList({sessionActionLoading: "other"});

        screen.getAllByRole("button", {name: "Log out"}).forEach((button) => expect(button).toBeDisabled());
    });
});
