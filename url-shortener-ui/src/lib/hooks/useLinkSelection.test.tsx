import {act, renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useLinkSelection} from "@/lib/hooks/useLinkSelection";
import {createLinkItem} from "@/test/link-utils";
import type {LinkItem} from "@/lib/types";

const LINK_A = createLinkItem({id: "a"});
const LINK_B = createLinkItem({id: "b"});

function renderSelection(links: LinkItem[], pageKey = "0") {
    return renderHook(({links: currentLinks, pageKey: currentKey}) => useLinkSelection(currentLinks, currentKey), {
        initialProps: {links, pageKey},
    });
}

describe("useLinkSelection", () => {
    it("toggles links in and out, keeping list order", () => {
        const {result} = renderSelection([LINK_A, LINK_B]);

        act(() => result.current.toggle(LINK_B));
        act(() => result.current.toggle(LINK_A));
        act(() => result.current.toggle(LINK_B));

        expect(result.current.selectedLinks).toEqual([LINK_A]);
        expect(result.current.isSelected("a")).toBe(true);
        expect(result.current.isSelected("b")).toBe(false);
    });

    it("drops a selected link that leaves the page", () => {
        const {result, rerender} = renderSelection([LINK_A, LINK_B]);
        act(() => result.current.toggle(LINK_A));

        rerender({links: [LINK_B], pageKey: "0"});

        expect(result.current.selectedLinks).toEqual([]);
    });

    it("starts over when the page, filter or search changes", () => {
        const {result, rerender} = renderSelection([LINK_A, LINK_B]);
        act(() => result.current.toggle(LINK_A));

        rerender({links: [LINK_A, LINK_B], pageKey: "1"});

        expect(result.current.selectedLinks).toEqual([]);
        expect(result.current.isSelected("a")).toBe(false);
    });

    it("starts select mode with nothing picked, and clearing leaves it", () => {
        const {result} = renderSelection([LINK_A, LINK_B]);

        act(() => result.current.startSelecting());
        const startedMode = {isSelectMode: result.current.isSelectMode, isSelecting: result.current.isSelecting};
        act(() => result.current.clear());

        expect(startedMode).toEqual({isSelectMode: true, isSelecting: true});
        expect(result.current.isSelectMode).toBe(false);
        expect(result.current.isSelecting).toBe(false);
    });

    it("leaves select mode when the page changes", () => {
        const {result, rerender} = renderSelection([LINK_A, LINK_B]);
        act(() => result.current.startSelecting());

        rerender({links: [LINK_A, LINK_B], pageKey: "1"});

        expect(result.current.isSelectMode).toBe(false);
    });

    it("clears the selection", () => {
        const {result} = renderSelection([LINK_A, LINK_B]);
        act(() => result.current.toggle(LINK_A));

        act(() => result.current.clear());

        expect(result.current.selectedLinks).toEqual([]);
    });
});
