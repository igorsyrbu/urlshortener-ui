import {fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import {ICON_ANIMATING_ATTRIBUTE, ICON_ANIMATION_TRIGGER_PROPS} from "@/lib/icon-animation";
import {fireAnimationEnd} from "@/test/animation-utils";

const ICON_ANIMATION = "icon-link-apart-up";

function renderControl(): HTMLElement {
    render(<button type="button" {...ICON_ANIMATION_TRIGGER_PROPS}>Links</button>);
    return screen.getByRole("button", {name: "Links"});
}

function isAnimating(control: HTMLElement): boolean {
    return control.hasAttribute(ICON_ANIMATING_ATTRIBUTE);
}

describe("ICON_ANIMATION_TRIGGER_PROPS", () => {
    it("starts the icon animation when a mouse moves over the control", () => {
        const control = renderControl();

        fireEvent.pointerEnter(control, {pointerType: "mouse"});

        expect(isAnimating(control)).toBe(true);
    });

    it("lets the animation play to the end after the pointer leaves", () => {
        const control = renderControl();
        fireEvent.pointerEnter(control, {pointerType: "mouse"});

        fireEvent.pointerLeave(control, {pointerType: "mouse"});
        expect(isAnimating(control)).toBe(true);

        fireAnimationEnd(control, ICON_ANIMATION);
        expect(isAnimating(control)).toBe(false);
    });

    it("plays again on the next hover once the previous run has ended", () => {
        const control = renderControl();
        fireEvent.pointerEnter(control, {pointerType: "mouse"});
        fireAnimationEnd(control, ICON_ANIMATION);
        expect(isAnimating(control)).toBe(false);

        fireEvent.pointerEnter(control, {pointerType: "mouse"});

        expect(isAnimating(control)).toBe(true);
    });

    it("keeps running when another animation inside the control ends", () => {
        const control = renderControl();
        fireEvent.pointerEnter(control, {pointerType: "mouse"});

        fireAnimationEnd(control, "enter");

        expect(isAnimating(control)).toBe(true);
    });

    it("does not treat a tap as a hover", () => {
        const control = renderControl();

        fireEvent.pointerEnter(control, {pointerType: "touch"});

        expect(isAnimating(control)).toBe(false);
    });

    it("starts the animation when the control gets keyboard focus", async () => {
        const user = userEvent.setup();
        const control = renderControl();

        await user.tab();

        expect(control).toHaveFocus();
        expect(isAnimating(control)).toBe(true);
    });
});
