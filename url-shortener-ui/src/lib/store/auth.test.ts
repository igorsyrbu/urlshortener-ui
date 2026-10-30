import {afterEach, describe, expect, it} from "vitest";
import {useAuthStore} from "@/lib/store/auth";
import {hasSessionHint, setSessionHint} from "@/lib/session-hint";

const initialState = useAuthStore.getInitialState();
const ACCESS_TOKEN = "access-token";

describe("auth store", () => {
    afterEach(() => {
        useAuthStore.setState(initialState, true);
    });

    it("starts signed out", () => {
        expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it("clears the token on logout", () => {
        useAuthStore.getState().setAccessToken(ACCESS_TOKEN);

        useAuthStore.getState().logout();

        expect(useAuthStore.getState().accessToken).toBeNull();
    });

    it("forgets that this browser had a session on logout", () => {
        setSessionHint();

        useAuthStore.getState().logout();

        expect(hasSessionHint()).toBe(false);
    });
});
