import {afterEach, describe, expect, it, vi} from "vitest";
import {fetchWithAuth} from "@/lib/api";
import {API_ENDPOINTS, TRACKER_MODE} from "@/lib/constants";
import {logger} from "@/lib/logger";
import type {TrackerMode} from "@/lib/store/preferences";
import {usePreferencesStore} from "@/lib/store/preferences";

vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn()}));
vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const initialState = usePreferencesStore.getInitialState();

function deferredResponse(): {promise: Promise<Response>; resolve: (response: Response) => void} {
    let resolve: (response: Response) => void = () => undefined;
    const promise = new Promise<Response>((resolver) => { resolve = resolver; });
    return {promise, resolve};
}

describe("preferences store loading", () => {
    afterEach(() => {
        usePreferencesStore.setState(initialState, true);
    });

    it("starts unchecked", () => {
        expect(usePreferencesStore.getState().trackerMode).toBeNull();
        expect(usePreferencesStore.getState().hasLoaded).toBe(false);
    });

    it("applies the server mode and resolves true", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: TRACKER_MODE.AUTO_CLEAN}));

        const applied = await usePreferencesStore.getState().fetchPreferences();

        expect(applied).toBe(true);
        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.AUTO_CLEAN);
        expect(usePreferencesStore.getState().hasLoaded).toBe(true);
        expect(usePreferencesStore.getState().isLoading).toBe(false);
        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME_PREFERENCES);
    });

    it("loads only once per session", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: TRACKER_MODE.SUGGEST}));
        await usePreferencesStore.getState().fetchPreferences();

        const applied = await usePreferencesStore.getState().fetchPreferences();

        expect(applied).toBe(true);
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("resolves false without a second request while a load is in flight", async () => {
        const pendingLoad = deferredResponse();
        vi.mocked(fetchWithAuth).mockReturnValueOnce(pendingLoad.promise);

        const first = usePreferencesStore.getState().fetchPreferences();
        const second = await usePreferencesStore.getState().fetchPreferences();
        pendingLoad.resolve(Response.json({urlCleanerMode: TRACKER_MODE.SUGGEST}));

        expect(second).toBe(false);
        expect(await first).toBe(true);
        expect(fetchWithAuth).toHaveBeenCalledOnce();
    });

    it("resolves false and warns when the response is an error", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        const applied = await usePreferencesStore.getState().fetchPreferences();

        expect(applied).toBe(false);
        expect(usePreferencesStore.getState().hasLoaded).toBe(false);
        expect(usePreferencesStore.getState().isLoading).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith("Failed to load preferences", {status: 500});
    });

    it.each([
        ["an unknown mode", {urlCleanerMode: "SOMETHING_ELSE"}],
        ["a non-string mode", {urlCleanerMode: 3}],
        ["a missing mode", {}],
        ["a null payload", null],
    ])("ignores %s in the payload", async (_description, payload) => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json(payload));

        const applied = await usePreferencesStore.getState().fetchPreferences();

        expect(applied).toBe(false);
        expect(usePreferencesStore.getState().trackerMode).toBeNull();
        expect(usePreferencesStore.getState().hasLoaded).toBe(false);
    });

    it("resolves false and allows a retry when the request rejects", async () => {
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: TRACKER_MODE.DISABLED}));

        const firstAttempt = await usePreferencesStore.getState().fetchPreferences();
        const retry = await usePreferencesStore.getState().fetchPreferences();

        expect(firstAttempt).toBe(false);
        expect(retry).toBe(true);
        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.DISABLED);
    });
});

describe("preferences store updating", () => {
    afterEach(() => {
        usePreferencesStore.setState(initialState, true);
    });

    function loadedWith(mode: TrackerMode): void {
        usePreferencesStore.setState({trackerMode: mode, hasLoaded: true});
    }

    it("selects the mode optimistically while the request is pending", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        const pendingSave = deferredResponse();
        vi.mocked(fetchWithAuth).mockReturnValueOnce(pendingSave.promise);

        const saving = usePreferencesStore.getState().updatePreferences(TRACKER_MODE.AUTO_CLEAN);

        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.AUTO_CLEAN);
        expect(usePreferencesStore.getState().isSaving).toBe(true);
        pendingSave.resolve(Response.json({urlCleanerMode: TRACKER_MODE.AUTO_CLEAN}));
        await saving;
        expect(usePreferencesStore.getState().isSaving).toBe(false);
    });

    it("sends the mode with a PUT request", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: TRACKER_MODE.DISABLED}));

        await usePreferencesStore.getState().updatePreferences(TRACKER_MODE.DISABLED);

        expect(fetchWithAuth).toHaveBeenCalledExactlyOnceWith(API_ENDPOINTS.USERS_ME_PREFERENCES, {
            method: "PUT",
            body: JSON.stringify({urlCleanerMode: TRACKER_MODE.DISABLED}),
        });
    });

    it("prefers the mode echoed by the server", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: TRACKER_MODE.DISABLED}));

        await usePreferencesStore.getState().updatePreferences(TRACKER_MODE.AUTO_CLEAN);

        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.DISABLED);
    });

    it("keeps the selected mode when the server echo is invalid", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: "BOGUS"}));

        await usePreferencesStore.getState().updatePreferences(TRACKER_MODE.AUTO_CLEAN);

        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.AUTO_CLEAN);
        expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("marks preferences as loaded after a successful save", async () => {
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(Response.json({urlCleanerMode: TRACKER_MODE.SUGGEST}));

        await usePreferencesStore.getState().updatePreferences(TRACKER_MODE.SUGGEST);

        expect(usePreferencesStore.getState().hasLoaded).toBe(true);
    });

    it("reverts the selection and rethrows when the server rejects the save", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        vi.mocked(fetchWithAuth).mockResolvedValueOnce(new Response(null, {status: 500}));

        await expect(usePreferencesStore.getState().updatePreferences(TRACKER_MODE.AUTO_CLEAN))
            .rejects.toThrow("Failed to save preferences: 500");

        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.SUGGEST);
        expect(usePreferencesStore.getState().isSaving).toBe(false);
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("reverts the selection when the request rejects", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error("offline"));

        await expect(usePreferencesStore.getState().updatePreferences(TRACKER_MODE.DISABLED)).rejects.toThrow("offline");

        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.SUGGEST);
    });

    it("does nothing when the mode is already selected", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);

        await usePreferencesStore.getState().updatePreferences(TRACKER_MODE.SUGGEST);

        expect(fetchWithAuth).not.toHaveBeenCalled();
    });

    it("ignores a second update while a save is in flight", async () => {
        loadedWith(TRACKER_MODE.SUGGEST);
        const pendingSave = deferredResponse();
        vi.mocked(fetchWithAuth).mockReturnValueOnce(pendingSave.promise);

        const saving = usePreferencesStore.getState().updatePreferences(TRACKER_MODE.AUTO_CLEAN);
        await usePreferencesStore.getState().updatePreferences(TRACKER_MODE.DISABLED);
        pendingSave.resolve(Response.json({urlCleanerMode: TRACKER_MODE.AUTO_CLEAN}));
        await saving;

        expect(fetchWithAuth).toHaveBeenCalledOnce();
        expect(usePreferencesStore.getState().trackerMode).toBe(TRACKER_MODE.AUTO_CLEAN);
    });
});
