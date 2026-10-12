import {act, renderHook} from "@testing-library/react";
import type {KeyboardEvent} from "react";
import {describe, expect, it, vi} from "vitest";
import {useTagSelectKeyboard} from "@/lib/hooks/useTagSelectKeyboard";
import {createTag} from "@/test/tag-utils";

const TAGS = [
    createTag({id: "tag-b", name: "Beta"}),
    createTag({id: "tag-a", name: "Alpha"}),
    createTag({id: "tag-c", name: "Gamma"}),
];

interface Callbacks {
    onChange: ReturnType<typeof vi.fn<(tagIds: string[]) => void>>;
    handleCreate: ReturnType<typeof vi.fn<() => void>>;
    closePopover: ReturnType<typeof vi.fn<() => void>>;
}

type KeyboardResult = ReturnType<typeof renderHook<ReturnType<typeof useTagSelectKeyboard>, unknown>>["result"];

function renderKeyboard(selectedTagIds: string[] = []): Callbacks & {result: KeyboardResult} {
    const callbacks: Callbacks = {onChange: vi.fn(), handleCreate: vi.fn(), closePopover: vi.fn()};
    const {result} = renderHook(() => useTagSelectKeyboard({tags: TAGS, selectedTagIds, ...callbacks}));
    return {result, ...callbacks};
}

function keyEvent(key: string): KeyboardEvent {
    // The hook only reads `key` and calls `preventDefault`; building a full React synthetic event is not possible outside React.
    return {key, preventDefault: vi.fn()} as unknown as KeyboardEvent;
}

describe("useTagSelectKeyboard", () => {
    describe("filtering", () => {
        it("lists all tags sorted by name when the search is empty", () => {
            const {result} = renderKeyboard();

            expect(result.current.filteredTags.map((tag) => tag.name)).toEqual(["Alpha", "Beta", "Gamma"]);
            expect(result.current.showCreateOption).toBe(false);
            expect(result.current.activeIndex).toBe(-1);
        });

        it("filters tags by a case-insensitive substring", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleSearchChange("ET"); });

            expect(result.current.filteredTags.map((tag) => tag.name)).toEqual(["Beta"]);
        });

        it("offers to create a tag when nothing matches exactly", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleSearchChange("alp"); });

            expect(result.current.filteredTags).toHaveLength(1);
            expect(result.current.showCreateOption).toBe(true);
        });

        it("does not offer to create a tag that already exists, ignoring case", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleSearchChange("alpha"); });

            expect(result.current.showCreateOption).toBe(false);
        });

        it("does not offer to create a tag from whitespace only", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleSearchChange("   "); });

            expect(result.current.showCreateOption).toBe(false);
        });

        it("highlights the create option when searching for an unknown tag", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleSearchChange("zzz"); });

            expect(result.current.filteredTags).toEqual([]);
            expect(result.current.activeIndex).toBe(0);
        });

        it("resets the highlight when the search matches an existing tag exactly", () => {
            const {result} = renderKeyboard();
            act(() => { result.current.setActiveIndex(1); });

            act(() => { result.current.handleSearchChange("Alpha"); });

            expect(result.current.activeIndex).toBe(-1);
        });
    });

    describe("navigation", () => {
        it("moves the highlight down and wraps to the first item", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleKeyDown(keyEvent("ArrowDown")); });
            expect(result.current.activeIndex).toBe(0);
            act(() => { result.current.handleKeyDown(keyEvent("ArrowDown")); });
            act(() => { result.current.handleKeyDown(keyEvent("ArrowDown")); });
            expect(result.current.activeIndex).toBe(2);

            act(() => { result.current.handleKeyDown(keyEvent("ArrowDown")); });
            expect(result.current.activeIndex).toBe(0);
        });

        it("moves the highlight up and wraps to the last item", () => {
            const {result} = renderKeyboard();

            act(() => { result.current.handleKeyDown(keyEvent("ArrowUp")); });
            expect(result.current.activeIndex).toBe(2);

            act(() => { result.current.handleKeyDown(keyEvent("ArrowUp")); });
            expect(result.current.activeIndex).toBe(1);
        });

        it("includes the create option as the last navigable item", () => {
            const {result} = renderKeyboard();
            act(() => { result.current.handleSearchChange("a"); });
            act(() => { result.current.setActiveIndex(-1); });

            act(() => { result.current.handleKeyDown(keyEvent("ArrowUp")); });

            expect(result.current.filteredTags).toHaveLength(3);
            expect(result.current.activeIndex).toBe(3);
        });

        it("prevents the default browser behavior for arrow keys", () => {
            const {result} = renderKeyboard();
            const event = keyEvent("ArrowDown");

            act(() => { result.current.handleKeyDown(event); });

            expect(event.preventDefault).toHaveBeenCalledOnce();
        });
    });

    describe("selection", () => {
        it("selects the highlighted tag on Enter", () => {
            const {result, onChange} = renderKeyboard(["tag-c"]);
            act(() => { result.current.setActiveIndex(0); });

            act(() => { result.current.handleKeyDown(keyEvent("Enter")); });

            expect(onChange).toHaveBeenCalledExactlyOnceWith(["tag-c", "tag-a"]);
        });

        it("deselects an already selected tag on Enter", () => {
            const {result, onChange} = renderKeyboard(["tag-a", "tag-c"]);
            act(() => { result.current.setActiveIndex(0); });

            act(() => { result.current.handleKeyDown(keyEvent("Enter")); });

            expect(onChange).toHaveBeenCalledExactlyOnceWith(["tag-c"]);
        });

        it("creates a tag on Enter when the create option is highlighted", () => {
            const {result, handleCreate, onChange} = renderKeyboard();
            act(() => { result.current.handleSearchChange("zzz"); });

            act(() => { result.current.handleKeyDown(keyEvent("Enter")); });

            expect(handleCreate).toHaveBeenCalledOnce();
            expect(onChange).not.toHaveBeenCalled();
        });

        it("ignores Enter when nothing is highlighted", () => {
            const {result, onChange, handleCreate} = renderKeyboard();
            const event = keyEvent("Enter");

            act(() => { result.current.handleKeyDown(event); });

            expect(onChange).not.toHaveBeenCalled();
            expect(handleCreate).not.toHaveBeenCalled();
            expect(event.preventDefault).not.toHaveBeenCalled();
        });

        it("ignores Enter when the highlight is past the last item", () => {
            const {result, onChange} = renderKeyboard();
            act(() => { result.current.setActiveIndex(10); });

            act(() => { result.current.handleKeyDown(keyEvent("Enter")); });

            expect(onChange).not.toHaveBeenCalled();
        });
    });

    it("closes the popover on Escape", () => {
        const {result, closePopover} = renderKeyboard();

        act(() => { result.current.handleKeyDown(keyEvent("Escape")); });

        expect(closePopover).toHaveBeenCalledOnce();
    });

    it("ignores unrelated keys", () => {
        const {result, onChange, closePopover} = renderKeyboard();

        act(() => { result.current.handleKeyDown(keyEvent("a")); });

        expect(result.current.activeIndex).toBe(-1);
        expect(onChange).not.toHaveBeenCalled();
        expect(closePopover).not.toHaveBeenCalled();
    });
});
