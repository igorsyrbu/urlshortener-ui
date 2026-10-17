import {act, renderHook} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {toast} from "sonner";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {COPIED_ANNOUNCEMENT, COPY_FAILED_LOG_MESSAGE, COPY_FAILED_MESSAGE, COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import {useAnnouncerStore} from "@/lib/store/announcer";
import {useCopyToClipboard} from "@/lib/hooks/useCopyToClipboard";
import {logger} from "@/lib/logger";

vi.mock("@/lib/logger", () => ({logger: {error: vi.fn()}}));
vi.mock("sonner", () => ({toast: {error: vi.fn()}}));

const TEXT = "https://sho.rt/abc";
const CUSTOM_FAILURE_MESSAGE = "Failed to copy theme";
const HALF_FEEDBACK_MS = COPY_FEEDBACK_DURATION_MS / 2;

describe("useCopyToClipboard", () => {
    beforeEach(() => {
        vi.useFakeTimers({shouldAdvanceTime: true});
        // user-event installs the clipboard stub that navigator.clipboard resolves to in jsdom.
        userEvent.setup();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("writes the text and reports it as copied", async () => {
        const {result} = renderHook(() => useCopyToClipboard());

        await act(() => result.current.copy(TEXT));

        expect(await navigator.clipboard.readText()).toBe(TEXT);
        expect(result.current.isCopied).toBe(true);
    });

    it("announces the copy to screen readers", async () => {
        const {result} = renderHook(() => useCopyToClipboard());

        await act(() => result.current.copy(TEXT));

        expect(useAnnouncerStore.getState().message).toBe(COPIED_ANNOUNCEMENT);
    });

    it("clears the copied state after the feedback duration", async () => {
        const {result} = renderHook(() => useCopyToClipboard());
        await act(() => result.current.copy(TEXT));

        await act(() => vi.advanceTimersByTimeAsync(COPY_FEEDBACK_DURATION_MS));

        expect(result.current.isCopied).toBe(false);
    });

    it("restarts the feedback duration when copying again", async () => {
        const {result} = renderHook(() => useCopyToClipboard());
        await act(() => result.current.copy(TEXT));
        await act(() => vi.advanceTimersByTimeAsync(HALF_FEEDBACK_MS));

        await act(() => result.current.copy(TEXT));
        await act(() => vi.advanceTimersByTimeAsync(HALF_FEEDBACK_MS));

        expect(result.current.isCopied).toBe(true);
    });

    it("does not report success, logs and shows an error toast when the write fails", async () => {
        const clipboardError = new Error("denied");
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(clipboardError);
        const {result} = renderHook(() => useCopyToClipboard());

        await act(() => result.current.copy(TEXT));

        expect(result.current.isCopied).toBe(false);
        expect(logger.error).toHaveBeenCalledWith(COPY_FAILED_LOG_MESSAGE, clipboardError);
        expect(toast.error).toHaveBeenCalledExactlyOnceWith(COPY_FAILED_MESSAGE);
    });

    it("uses the caller's failure message", async () => {
        vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
        const {result} = renderHook(() => useCopyToClipboard(CUSTOM_FAILURE_MESSAGE));

        await act(() => result.current.copy(TEXT));

        expect(toast.error).toHaveBeenCalledExactlyOnceWith(CUSTOM_FAILURE_MESSAGE);
    });

    it("treats a missing clipboard API (insecure context) as a failure", async () => {
        vi.stubGlobal("navigator", {...navigator, clipboard: undefined});
        const {result} = renderHook(() => useCopyToClipboard());

        await act(() => result.current.copy(TEXT));

        expect(result.current.isCopied).toBe(false);
        expect(toast.error).toHaveBeenCalledExactlyOnceWith(COPY_FAILED_MESSAGE);
    });
});
