import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {CurrentSessionCard} from "@/components/settings/CurrentSessionCard";
import {createUserSession} from "@/test/user-session-utils";

type CardProps = Parameters<typeof CurrentSessionCard>[0];

function renderCard(overrides: Partial<CardProps> = {}): CardProps {
    const props: CardProps = {
        session: createUserSession({current: true}),
        isLoading: false,
        hasOtherSessions: false,
        isActionDisabled: false,
        isLoggingOut: false,
        isTerminatingOther: false,
        onLogout: vi.fn(),
        onTerminateOther: vi.fn(),
        ...overrides,
    };
    render(<CurrentSessionCard {...props}/>);
    return props;
}

describe("CurrentSessionCard", () => {
    it("shows a loading skeleton while the session is loading", () => {
        renderCard({isLoading: true, session: undefined});

        expect(screen.getByRole("status", {name: "Loading sessions"})).toBeInTheDocument();
    });

    it("explains when the current session is unavailable", () => {
        renderCard({session: undefined});

        expect(screen.getByText("Current session information unavailable.")).toBeInTheDocument();
    });

    it("describes the current device, its location and marks it as current", () => {
        renderCard();

        expect(screen.getByText("MacBook (macOS)")).toBeInTheDocument();
        expect(screen.getByText("Montreal, Quebec, Canada")).toBeInTheDocument();
        expect(screen.getByText("This device")).toBeInTheDocument();
    });

    it("falls back to generic labels for unknown device and location", () => {
        renderCard({session: createUserSession({current: true, device: "unknown", os: "unknown", city: "", region: "unknown", country: ""})});

        expect(screen.getByText("Unknown Device")).toBeInTheDocument();
        expect(screen.getByText("Unknown Location")).toBeInTheDocument();
    });

    it("requests logout of the current session", async () => {
        const user = userEvent.setup();
        const props = renderCard();

        await user.click(screen.getByRole("button", {name: "Log out"}));

        expect(props.onLogout).toHaveBeenCalledOnce();
    });

    it("offers to log out of other sessions only when there are some", async () => {
        const user = userEvent.setup();
        const props = renderCard({hasOtherSessions: true});

        await user.click(screen.getByRole("button", {name: "Log out all other sessions"}));

        expect(props.onTerminateOther).toHaveBeenCalledOnce();
    });

    it("hides the log-out-others action when there are no other sessions", () => {
        renderCard({hasOtherSessions: false});

        expect(screen.queryByRole("button", {name: "Log out all other sessions"})).not.toBeInTheDocument();
    });

    it("disables both actions while another action is running", () => {
        renderCard({hasOtherSessions: true, isActionDisabled: true});

        expect(screen.getByRole("button", {name: "Log out"})).toBeDisabled();
        expect(screen.getByRole("button", {name: "Log out all other sessions"})).toBeDisabled();
    });

    it("shows progress while logging out", () => {
        renderCard({isLoggingOut: true, isActionDisabled: true});

        expect(screen.getByRole("button", {name: "Logging out..."})).toBeDisabled();
    });

    it("shows progress while logging out of other sessions", () => {
        renderCard({hasOtherSessions: true, isTerminatingOther: true, isActionDisabled: true});

        expect(screen.getByRole("button", {name: "Logging out..."})).toBeDisabled();
    });
});
