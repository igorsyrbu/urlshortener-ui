import {useShortcutsStore} from "@/lib/store/shortcuts";
import {isModalOpen} from "@/lib/utils";

export interface ShortcutDescription {
    key: string;
    action: string;
    where: string;
}

/** Every single-key shortcut, in the order the help dialog lists them; the handlers use the same keys. */
export const SHORTCUTS = {
    CREATE: {key: "c", action: "Create a link, or a tag on the Tags page", where: "Any page"},
    TOGGLE_ARCHIVED: {key: "a", action: "Show or hide archived links", where: "Links, with no card active"},
    EDIT: {key: "e", action: "Edit", where: "The focused, hovered or open link or tag"},
    QR_CODE: {key: "q", action: "QR code", where: "The focused, hovered or open link"},
    ARCHIVE: {key: "a", action: "Archive or unarchive", where: "The focused, hovered or open link"},
    DELETE: {key: "d", action: "Delete", where: "The focused, hovered or open link or tag"},
    HELP: {key: "?", action: "Show these shortcuts", where: "Any page"},
} as const satisfies Record<string, ShortcutDescription>;

const EDITABLE_ROLES = new Set(["textbox", "combobox", "listbox", "searchbox", "spinbutton"]);

/** Where typing a letter means text, not a command: fields, editable content and text-like widgets. */
export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
    if (target.isContentEditable) return true;
    const role = target.getAttribute("role");
    return role !== null && EDITABLE_ROLES.has(role);
}

/**
 * Whether a key press may run a single-key shortcut: shortcuts on, a plain press (no Ctrl, Meta or Alt; Shift is
 * part of `?`), not a held-down repeat, not typed into an editable target, and no dialog open.
 */
export function canRunShortcut(event: KeyboardEvent): boolean {
    if (!useShortcutsStore.getState().isEnabled) return false;
    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return false;
    if (isEditableTarget(event.target)) return false;
    return !isModalOpen();
}

export function isShortcutKey(event: KeyboardEvent, shortcut: ShortcutDescription): boolean {
    return event.key.toLowerCase() === shortcut.key;
}

/** A card's shortcuts apply while its menu is open, while it holds keyboard focus, or under the pointer. */
export function isCardShortcutTarget(card: HTMLElement | null, isMenuOpen: boolean): boolean {
    if (isMenuOpen) return true;
    if (!card) return false;
    return card.contains(document.activeElement) || card.matches(":hover");
}
