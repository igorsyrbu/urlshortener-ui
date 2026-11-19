import type {AnimationEvent, FocusEvent, PointerEvent} from "react";

/** Set on a control while its `icon-hover-*` icon plays; `globals.css` starts the animation from it. */
export const ICON_ANIMATING_ATTRIBUTE = "data-icon-animating";

const ICON_ANIMATION_NAME_PREFIX = "icon-";

function isRunningIconAnimation(animation: Animation): boolean {
    return animation instanceof CSSAnimation
        && animation.animationName.startsWith(ICON_ANIMATION_NAME_PREFIX)
        && animation.playState !== "finished";
}

/** Staggered parts end one by one; the run is over when none of the icon's animations is still going. */
function hasIconAnimationRunning(control: HTMLElement): boolean {
    if (typeof control.getAnimations !== "function") return false;
    return control.getAnimations({subtree: true}).some(isRunningIconAnimation);
}

function startIconAnimation(control: HTMLElement): void {
    if (control.hasAttribute(ICON_ANIMATING_ATTRIBUTE)) {
        // A run in progress is left alone, so leaving and re-entering does not restart it halfway.
        if (hasIconAnimationRunning(control)) return;
        // A run that never reported its end (the control was hidden mid-run, e.g. the sidebar at a narrow width) is
        // dropped; reading layout applies the removal, so setting the attribute again starts a fresh run.
        control.removeAttribute(ICON_ANIMATING_ATTRIBUTE);
        control.getBoundingClientRect();
    }
    control.setAttribute(ICON_ANIMATING_ATTRIBUTE, "");
}

function handlePointerEnter(event: PointerEvent<HTMLElement>): void {
    // A tap is not a hover: on touch the control simply acts.
    if (event.pointerType === "touch") return;
    startIconAnimation(event.currentTarget);
}

function handleFocus(event: FocusEvent<HTMLElement>): void {
    if (!event.currentTarget.matches(":focus-visible")) return;
    startIconAnimation(event.currentTarget);
}

function handleAnimationEnd(event: AnimationEvent<HTMLElement>): void {
    const control = event.currentTarget;
    if (!event.animationName.startsWith(ICON_ANIMATION_NAME_PREFIX) || hasIconAnimationRunning(control)) return;
    control.removeAttribute(ICON_ANIMATING_ATTRIBUTE);
}

/**
 * Spread on a control that holds an `icon-hover-*` icon. Hover (mouse or pen) or keyboard focus starts the animation,
 * and it always plays to the end: CSS keyed to `:hover` would stop it the moment the pointer leaves.
 */
export const ICON_ANIMATION_TRIGGER_PROPS = {
    onPointerEnter: handlePointerEnter,
    onFocus: handleFocus,
    onAnimationEnd: handleAnimationEnd,
} as const;
