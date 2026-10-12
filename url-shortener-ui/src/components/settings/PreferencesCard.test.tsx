import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {PreferencesCard} from "@/components/settings/PreferencesCard";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, TRACKER_MODE, TRACKER_MODE_DESCRIPTIONS, TRACKER_MODE_LABELS} from "@/lib/constants";
import {usePreferencesStore} from "@/lib/store/preferences";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));
vi.mock("sonner", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const initialStoreState = usePreferencesStore.getState();

function modeOption(mode: keyof typeof TRACKER_MODE_LABELS): HTMLElement {
    return screen.getByRole("radio", {name: `${TRACKER_MODE_LABELS[mode]}: ${TRACKER_MODE_DESCRIPTIONS[mode]}`});
}

function respondWithMode(urlCleanerMode: string): Response {
    return Response.json({urlCleanerMode});
}

describe("PreferencesCard", () => {
    beforeEach(() => {
        usePreferencesStore.setState(initialStoreState, true);
    });

    it("loads the saved tracker mode and marks it as selected", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(respondWithMode(TRACKER_MODE.SUGGEST));

        render(<PreferencesCard/>);

        await waitFor(() => expect(modeOption(TRACKER_MODE.SUGGEST)).toBeChecked());
        expect(modeOption(TRACKER_MODE.DISABLED)).not.toBeChecked();
        expect(modeOption(TRACKER_MODE.AUTO_CLEAN)).not.toBeChecked();
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME_PREFERENCES);
    });

    it("shows placeholders instead of options while loading", () => {
        vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise(() => undefined));

        render(<PreferencesCard/>);

        expect(screen.getByRole("radiogroup", {name: "Tracker detection mode"})).toHaveAttribute("aria-busy", "true");
        expect(screen.queryAllByRole("radio")).toHaveLength(0);
    });

    it("offers a retry when the preferences cannot be loaded", async () => {
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(new Response(null, {status: 500}))
            .mockResolvedValueOnce(respondWithMode(TRACKER_MODE.AUTO_CLEAN));
        const user = userEvent.setup();
        render(<PreferencesCard/>);

        await user.click(await screen.findByRole("button", {name: "Retry"}));

        await waitFor(() => expect(modeOption(TRACKER_MODE.AUTO_CLEAN)).toBeChecked());
        expect(screen.queryByRole("button", {name: "Retry"})).not.toBeInTheDocument();
    });

    it("saves a newly selected mode", async () => {
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(respondWithMode(TRACKER_MODE.DISABLED))
            .mockResolvedValueOnce(respondWithMode(TRACKER_MODE.AUTO_CLEAN));
        const user = userEvent.setup();
        render(<PreferencesCard/>);
        await waitFor(() => expect(modeOption(TRACKER_MODE.DISABLED)).toBeChecked());

        await user.click(modeOption(TRACKER_MODE.AUTO_CLEAN));

        await waitFor(() => expect(modeOption(TRACKER_MODE.AUTO_CLEAN)).toBeChecked());
        expect(fetchWithAuth).toHaveBeenLastCalledWith(API_ENDPOINTS.USERS_ME_PREFERENCES, {
            method: "PUT",
            body: JSON.stringify({urlCleanerMode: TRACKER_MODE.AUTO_CLEAN}),
        });
    });

    it("does not send a request when the active mode is clicked again", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(respondWithMode(TRACKER_MODE.SUGGEST));
        const user = userEvent.setup();
        render(<PreferencesCard/>);
        await waitFor(() => expect(modeOption(TRACKER_MODE.SUGGEST)).toBeChecked());

        await user.click(modeOption(TRACKER_MODE.SUGGEST));

        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("reverts the selection and shows an error toast when saving fails", async () => {
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(respondWithMode(TRACKER_MODE.DISABLED))
            .mockResolvedValueOnce(new Response(null, {status: 500}));
        const user = userEvent.setup();
        render(<PreferencesCard/>);
        await waitFor(() => expect(modeOption(TRACKER_MODE.DISABLED)).toBeChecked());

        await user.click(modeOption(TRACKER_MODE.SUGGEST));

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Couldn't save preference. Please try again."));
        expect(modeOption(TRACKER_MODE.DISABLED)).toBeChecked();
        expect(modeOption(TRACKER_MODE.SUGGEST)).not.toBeChecked();
    });

    it("disables every option while a save is in flight", async () => {
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(respondWithMode(TRACKER_MODE.DISABLED))
            .mockReturnValueOnce(new Promise(() => undefined));
        const user = userEvent.setup();
        render(<PreferencesCard/>);
        await waitFor(() => expect(modeOption(TRACKER_MODE.DISABLED)).toBeChecked());

        await user.click(modeOption(TRACKER_MODE.SUGGEST));

        screen.getAllByRole("radio").forEach((option) => expect(option).toBeDisabled());
    });
});
