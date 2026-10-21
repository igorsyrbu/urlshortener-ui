import {afterEach, describe, expect, it} from "vitest";
import {canRunShortcut, isCardShortcutTarget, isEditableTarget, isShortcutKey, SHORTCUTS} from "@/lib/keyboard-shortcuts";
import {useShortcutsStore} from "@/lib/store/shortcuts";

function keyDownOn(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
    let received: KeyboardEvent | null = null;
    target.addEventListener("keydown", (event) => { received = event as KeyboardEvent; }, {once: true});
    target.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, ...init}));
    if (received === null) throw new Error("The key event was not delivered");
    return received;
}

function element(html: string): HTMLElement {
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    return container.firstElementChild as HTMLElement;
}

afterEach(() => {
    document.body.innerHTML = "";
    useShortcutsStore.setState({isEnabled: true});
});

describe("isEditableTarget", () => {
    it.each([
        ["an input", "<input>"],
        ["a textarea", "<textarea></textarea>"],
        ["a select", "<select></select>"],
        ["editable content", "<div contenteditable=\"true\"></div>"],
        ["a combobox", "<div role=\"combobox\"></div>"],
        ["a listbox", "<div role=\"listbox\"></div>"],
        ["a search box", "<div role=\"searchbox\"></div>"],
    ])("treats %s as editable", (_name, html) => {
        const target = element(html);
        if (html.includes("contenteditable")) Object.defineProperty(target, "isContentEditable", {value: true});
        expect(isEditableTarget(target)).toBe(true);
    });

    it.each([["a button", "<button></button>"], ["a card", "<div tabindex=\"0\"></div>"]])("does not treat %s as editable", (_name, html) => {
        expect(isEditableTarget(element(html))).toBe(false);
    });

    it("does not treat a non-element as editable", () => {
        expect(isEditableTarget(window)).toBe(false);
    });
});

describe("canRunShortcut", () => {
    it("allows a plain key press on the page", () => {
        expect(canRunShortcut(keyDownOn(document.body, {key: "e"}))).toBe(true);
    });

    it.each([{ctrlKey: true}, {metaKey: true}, {altKey: true}, {repeat: true}])("ignores %o", (init) => {
        expect(canRunShortcut(keyDownOn(document.body, {key: "e", ...init}))).toBe(false);
    });

    it("lets Shift through, because ? needs it", () => {
        expect(canRunShortcut(keyDownOn(document.body, {key: "?", shiftKey: true}))).toBe(true);
    });

    it("ignores keys typed into a combobox", () => {
        expect(canRunShortcut(keyDownOn(element("<div role=\"combobox\" tabindex=\"0\"></div>"), {key: "d"}))).toBe(false);
    });

    it("ignores keys while a dialog is open", () => {
        element("<div role=\"dialog\"></div>");
        expect(canRunShortcut(keyDownOn(document.body, {key: "d"}))).toBe(false);
    });

    it("ignores every key when shortcuts are turned off", () => {
        useShortcutsStore.setState({isEnabled: false});
        expect(canRunShortcut(keyDownOn(document.body, {key: "c"}))).toBe(false);
    });
});

describe("isShortcutKey", () => {
    it("matches regardless of case", () => {
        expect(isShortcutKey(new KeyboardEvent("keydown", {key: "E"}), SHORTCUTS.EDIT)).toBe(true);
        expect(isShortcutKey(new KeyboardEvent("keydown", {key: "x"}), SHORTCUTS.EDIT)).toBe(false);
    });
});

describe("isCardShortcutTarget", () => {
    it("is the card whose menu is open", () => {
        expect(isCardShortcutTarget(element("<div></div>"), true)).toBe(true);
    });

    it("is the card that holds keyboard focus", () => {
        const card = element("<div tabindex=\"0\"><button>More</button></div>");
        card.querySelector("button")?.focus();
        expect(isCardShortcutTarget(card, false)).toBe(true);
    });

    it("is not a card that is neither focused, hovered nor open", () => {
        expect(isCardShortcutTarget(element("<div tabindex=\"0\"></div>"), false)).toBe(false);
    });
});
