import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {SearchBar} from "@/components/layout/SearchBar";

const MAX_SEARCH_LENGTH = 2048;

describe("SearchBar", () => {
    it("uses the placeholder it is given", () => {
        render(<SearchBar placeholder="Search by URL"/>);

        expect(screen.getByPlaceholderText("Search by URL")).toBeInTheDocument();
    });

    it("reports every change of the text", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SearchBar value="" onChange={onChange}/>);

        await user.type(screen.getByRole("textbox"), "ab");

        expect(onChange).toHaveBeenNthCalledWith(1, "a");
        expect(onChange).toHaveBeenNthCalledWith(2, "b");
    });

    it("limits the text length", () => {
        render(<SearchBar/>);

        expect(screen.getByRole("textbox")).toHaveAttribute("maxLength", String(MAX_SEARCH_LENGTH));
    });

    it("offers a clear button only while there is text", () => {
        const {rerender} = render(<SearchBar value=""/>);
        expect(screen.queryByRole("button", {name: "Clear search"})).not.toBeInTheDocument();

        rerender(<SearchBar value="query"/>);

        expect(screen.getByRole("button", {name: "Clear search"})).toBeInTheDocument();
    });

    it("clears the text and keeps focus in the field when the clear button is pressed", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SearchBar value="query" onChange={onChange}/>);

        await user.click(screen.getByRole("button", {name: "Clear search"}));

        expect(onChange).toHaveBeenCalledExactlyOnceWith("");
        expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("clears the text on Escape when there is text", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SearchBar value="query" onChange={onChange}/>);

        await user.type(screen.getByRole("textbox"), "{Escape}");

        expect(onChange).toHaveBeenCalledExactlyOnceWith("");
    });

    it("leaves the field on Escape when it is already empty", async () => {
        const user = userEvent.setup();
        const onChange = vi.fn();
        render(<SearchBar value="" onChange={onChange}/>);
        await user.click(screen.getByRole("textbox"));

        await user.keyboard("{Escape}");

        expect(screen.getByRole("textbox")).not.toHaveFocus();
        expect(onChange).not.toHaveBeenCalled();
    });

    it.each([
        {name: "Cmd+K", init: {metaKey: true}},
        {name: "Ctrl+K", init: {ctrlKey: true}},
    ])("focuses the field with $name", ({init}) => {
        render(<SearchBar/>);

        fireEvent.keyDown(window, {key: "k", ...init});

        expect(screen.getByRole("textbox")).toHaveFocus();
    });

    it("ignores a plain K key press", () => {
        render(<SearchBar/>);

        fireEvent.keyDown(window, {key: "k"});

        expect(screen.getByRole("textbox")).not.toHaveFocus();
    });

    it("does not steal focus from an open dialog", () => {
        render(
            <>
                <SearchBar/>
                <div role="dialog" aria-label="Open dialog"/>
            </>,
        );

        fireEvent.keyDown(window, {key: "k", metaKey: true});

        expect(screen.getByRole("textbox")).not.toHaveFocus();
    });
});
