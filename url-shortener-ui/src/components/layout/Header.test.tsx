import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {Header} from "@/components/layout/Header";

const navigation = vi.hoisted(() => ({pathname: "/links"}));

vi.mock("next/navigation", () => ({usePathname: () => navigation.pathname}));
vi.mock("next-themes", () => ({useTheme: () => ({resolvedTheme: "light", setTheme: vi.fn()})}));

describe("Header", () => {
    it.each([
        {pathname: "/links", title: "Links"},
        {pathname: "/tags", title: "Tags"},
        {pathname: "/dashboard", title: "Dashboard"},
        {pathname: "/analytics", title: "Analytics"},
        {pathname: "/settings", title: "Settings"},
    ])("titles the page $title on $pathname", ({pathname, title}) => {
        navigation.pathname = pathname;

        render(<Header/>);

        expect(screen.getByRole("heading", {name: title})).toBeInTheDocument();
    });

    it("shows no title on an unknown route", () => {
        navigation.pathname = "/unknown";

        render(<Header/>);

        expect(screen.queryByRole("heading", {level: 2, name: /.+/})).not.toBeInTheDocument();
    });

    it("labels the create button with the given label", () => {
        render(<Header createLabel="Create tag"/>);

        expect(screen.getByRole("button", {name: /Create tag/})).toBeInTheDocument();
    });

    it("calls onCreateClick when the create button is pressed", async () => {
        const user = userEvent.setup();
        const onCreateClick = vi.fn();
        render(<Header onCreateClick={onCreateClick}/>);

        await user.click(screen.getByRole("button", {name: /Create link/}));

        expect(onCreateClick).toHaveBeenCalledOnce();
    });

    it("shows the menu button only when a menu handler is provided", async () => {
        const user = userEvent.setup();
        const onMenuClick = vi.fn();
        const {rerender} = render(<Header/>);
        expect(screen.queryByRole("button", {name: "Open navigation menu"})).not.toBeInTheDocument();

        rerender(<Header onMenuClick={onMenuClick}/>);
        await user.click(screen.getByRole("button", {name: "Open navigation menu"}));

        expect(onMenuClick).toHaveBeenCalledOnce();
    });

    it("creates with the C shortcut", () => {
        const onCreateClick = vi.fn();
        render(<Header onCreateClick={onCreateClick}/>);

        fireEvent.keyDown(window, {key: "c"});

        expect(onCreateClick).toHaveBeenCalledOnce();
    });

    it.each([
        {name: "Cmd+C", init: {metaKey: true}},
        {name: "Ctrl+C", init: {ctrlKey: true}},
        {name: "Alt+C", init: {altKey: true}},
    ])("ignores $name so copying keeps working", ({init}) => {
        const onCreateClick = vi.fn();
        render(<Header onCreateClick={onCreateClick}/>);

        fireEvent.keyDown(window, {key: "c", ...init});

        expect(onCreateClick).not.toHaveBeenCalled();
    });

    it("ignores the shortcut while typing in a field", async () => {
        const user = userEvent.setup();
        const onCreateClick = vi.fn();
        render(<><Header onCreateClick={onCreateClick}/><input aria-label="Notes"/></>);

        await user.type(screen.getByLabelText("Notes"), "c");

        expect(onCreateClick).not.toHaveBeenCalled();
    });

    it("ignores the shortcut while a dialog is open", () => {
        const onCreateClick = vi.fn();
        render(<><Header onCreateClick={onCreateClick}/><div role="dialog" aria-label="Open dialog"/></>);

        fireEvent.keyDown(window, {key: "c"});

        expect(onCreateClick).not.toHaveBeenCalled();
    });
});
