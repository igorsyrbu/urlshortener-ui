import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {ProfileCard} from "@/components/settings/ProfileCard";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useAuthStore, UserProfile} from "@/lib/store/auth";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));
vi.mock("sonner", () => ({toast: {success: vi.fn(), error: vi.fn()}}));

const USER: UserProfile = {email: "ada@example.com", name: "Ada"};
const UPDATED_USER: UserProfile = {email: "ada@example.com", name: "Ada Lovelace"};

function renderProfileCard(user: UserProfile | null = USER): ReturnType<typeof userEvent.setup> {
    useAuthStore.setState({user});
    render(<ProfileCard/>);
    return userEvent.setup();
}

async function renameTo(user: ReturnType<typeof userEvent.setup>, name: string): Promise<void> {
    const nameInput = screen.getByLabelText("Name");
    await user.clear(nameInput);
    if (name) await user.type(nameInput, name);
}

describe("ProfileCard", () => {
    beforeEach(() => {
        useAuthStore.setState({accessToken: null, user: null});
    });

    it("shows a loading message and disables saving until the profile is available", () => {
        renderProfileCard(null);

        expect(screen.getByText("Loading profile...")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Save Changes"})).toBeDisabled();
    });

    it("shows the email as read-only and the name as editable", () => {
        renderProfileCard();

        expect(screen.getByLabelText("Email")).toHaveValue(USER.email);
        expect(screen.getByLabelText("Email")).toBeDisabled();
        expect(screen.getByLabelText("Name")).toHaveValue(USER.name);
    });

    it.each(["", "   "])("disables saving when the name is %j", async (name) => {
        const user = renderProfileCard();

        await renameTo(user, name);

        expect(screen.getByRole("button", {name: "Save Changes"})).toBeDisabled();
    });

    it("saves the new name, reloads the profile and confirms with a toast", async () => {
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(Response.json(UPDATED_USER));
        const user = renderProfileCard();
        await renameTo(user, "Ada Lovelace");

        await user.click(screen.getByRole("button", {name: "Save Changes"}));

        await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith("Profile updated successfully"));
        expect(fetchWithAuth).toHaveBeenNthCalledWith(1, API_ENDPOINTS.USERS_ME_NAME, {
            method: "PUT",
            body: JSON.stringify({name: "Ada Lovelace"}),
        });
        expect(fetchWithAuth).toHaveBeenNthCalledWith(2, API_ENDPOINTS.USERS_ME);
        expect(useAuthStore.getState().user).toEqual(UPDATED_USER);
    });

    it("disables the button and shows progress while saving", async () => {
        vi.mocked(fetchWithAuth).mockReturnValueOnce(new Promise(() => undefined));
        const user = renderProfileCard();

        await user.click(screen.getByRole("button", {name: "Save Changes"}));

        expect(screen.getByRole("button", {name: "Saving..."})).toBeDisabled();
    });

    it("shows an error toast and keeps the profile when the server rejects the update", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 400}));
        const user = renderProfileCard();

        await user.click(screen.getByRole("button", {name: "Save Changes"}));

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("Failed to update profile"));
        expect(fetchWithAuth).toHaveBeenCalledOnce();
        expect(useAuthStore.getState().user).toEqual(USER);
        expect(screen.getByRole("button", {name: "Save Changes"})).toBeEnabled();
    });

    it("reports an unexpected error when the request fails", async () => {
        const failure = new Error("network down");
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(failure);
        const user = renderProfileCard();

        await user.click(screen.getByRole("button", {name: "Save Changes"}));

        await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith("An unexpected error occurred while updating profile"));
        expect(logger.error).toHaveBeenCalledWith("Error updating name", failure);
        expect(screen.getByRole("button", {name: "Save Changes"})).toBeEnabled();
    });

    it("still confirms the update when reloading the profile fails", async () => {
        vi.mocked(fetchWithAuth)
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockRejectedValueOnce(new Error("offline"));
        const user = renderProfileCard();

        await user.click(screen.getByRole("button", {name: "Save Changes"}));

        await waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
        expect(logger.error).toHaveBeenCalledWith("Failed to load profile", expect.any(Error));
    });
});
