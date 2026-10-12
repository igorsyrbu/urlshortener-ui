import {afterEach, describe, expect, it} from "vitest";
import {useUIStore} from "@/lib/store/ui";

const initialState = useUIStore.getInitialState();

describe("UI store", () => {
    afterEach(() => {
        useUIStore.setState(initialState, true);
    });

    it("starts with both create modals closed", () => {
        expect(useUIStore.getState().isCreateModalOpen).toBe(false);
        expect(useUIStore.getState().isCreateTagModalOpen).toBe(false);
    });

    it("opens and closes the create link modal without touching the tag modal", () => {
        useUIStore.getState().setCreateModalOpen(true);
        expect(useUIStore.getState().isCreateModalOpen).toBe(true);
        expect(useUIStore.getState().isCreateTagModalOpen).toBe(false);

        useUIStore.getState().setCreateModalOpen(false);
        expect(useUIStore.getState().isCreateModalOpen).toBe(false);
    });

    it("opens and closes the create tag modal without touching the link modal", () => {
        useUIStore.getState().setCreateTagModalOpen(true);
        expect(useUIStore.getState().isCreateTagModalOpen).toBe(true);
        expect(useUIStore.getState().isCreateModalOpen).toBe(false);

        useUIStore.getState().setCreateTagModalOpen(false);
        expect(useUIStore.getState().isCreateTagModalOpen).toBe(false);
    });
});
