import {afterEach, describe, expect, it} from "vitest";
import {useAuthStore} from "@/lib/store/auth";
import type {UserProfile} from "@/lib/store/auth";

const initialState = useAuthStore.getInitialState();
const USER: UserProfile = {email: "ada@example.com", name: "Ada"};
const ACCESS_TOKEN = "access-token";

describe("auth store", () => {
    afterEach(() => {
        useAuthStore.setState(initialState, true);
    });

    it("starts signed out", () => {
        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
    });

    it("keeps the access token and the user profile independent", () => {
        useAuthStore.getState().setAccessToken(ACCESS_TOKEN);
        useAuthStore.getState().setUser(USER);

        useAuthStore.getState().setAccessToken(null);

        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(useAuthStore.getState().user).toEqual(USER);
    });

    it("clears both the token and the user on logout", () => {
        useAuthStore.getState().setAccessToken(ACCESS_TOKEN);
        useAuthStore.getState().setUser(USER);

        useAuthStore.getState().logout();

        expect(useAuthStore.getState().accessToken).toBeNull();
        expect(useAuthStore.getState().user).toBeNull();
    });
});
