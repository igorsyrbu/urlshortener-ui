import {afterEach, describe, expect, it, vi} from "vitest";
import {SHOW_ARCHIVED_STORAGE_KEY} from "@/lib/constants";
import {logger} from "@/lib/logger";
import {useLinkStore} from "@/lib/store/links";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn(), warn: vi.fn(), info: vi.fn()}}));

const initialState = useLinkStore.getInitialState();

describe("link store filters", () => {
    afterEach(() => {
        useLinkStore.setState(initialState, true);
    });

    it("persists the archived flag to localStorage when it changes", () => {
        useLinkStore.getState().setShowArchived(true);

        expect(useLinkStore.getState().showArchived).toBe(true);
        expect(localStorage.getItem(SHOW_ARCHIVED_STORAGE_KEY)).toBe("true");
    });

    it("still updates the flag and logs when localStorage rejects the write", () => {
        vi.spyOn(localStorage, "setItem").mockImplementation(() => { throw new Error("quota"); });

        useLinkStore.getState().setShowArchived(true);

        expect(useLinkStore.getState().showArchived).toBe(true);
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("is not hydrated until the saved choice has been read", () => {
        expect(useLinkStore.getState().isShowArchivedHydrated).toBe(false);

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().isShowArchivedHydrated).toBe(true);
    });

    it("restores a stored true value", () => {
        localStorage.setItem(SHOW_ARCHIVED_STORAGE_KEY, "true");

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(true);
    });

    it("restores a stored false value over an existing true value", () => {
        useLinkStore.setState({showArchived: true});
        localStorage.setItem(SHOW_ARCHIVED_STORAGE_KEY, "false");

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(false);
    });

    it("leaves the default when nothing is stored", () => {
        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(false);
    });

    it("logs, keeps the default and still counts as hydrated when localStorage cannot be read", () => {
        vi.spyOn(localStorage, "getItem").mockImplementation(() => { throw new Error("denied"); });

        useLinkStore.getState().hydrateShowArchived();

        expect(useLinkStore.getState().showArchived).toBe(false);
        expect(useLinkStore.getState().isShowArchivedHydrated).toBe(true);
        expect(logger.error).toHaveBeenCalledOnce();
    });

    it("updates the search query", () => {
        useLinkStore.getState().setSearchQuery("docs");

        expect(useLinkStore.getState().searchQuery).toBe("docs");
    });
});
