import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";

describe("useHasBeenOpened", () => {
    it("is false while the dialog has never been opened", () => {
        const {result, rerender} = renderHook(({isOpen}) => useHasBeenOpened(isOpen), {initialProps: {isOpen: false}});

        rerender({isOpen: false});

        expect(result.current).toBe(false);
    });

    it("is true on the render that opens the dialog", () => {
        const {result, rerender} = renderHook(({isOpen}) => useHasBeenOpened(isOpen), {initialProps: {isOpen: false}});

        rerender({isOpen: true});

        expect(result.current).toBe(true);
    });

    it("stays true after the dialog closes, so it is never unmounted", () => {
        const {result, rerender} = renderHook(({isOpen}) => useHasBeenOpened(isOpen), {initialProps: {isOpen: true}});

        rerender({isOpen: false});

        expect(result.current).toBe(true);
    });
});
