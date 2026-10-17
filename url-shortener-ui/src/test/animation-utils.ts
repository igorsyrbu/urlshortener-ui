import {fireEvent} from "@testing-library/react";

/**
 * Ends a CSS animation for a React `onAnimationEnd` handler. jsdom has no `AnimationEvent` but does have
 * `WebkitAnimation`, so React listens for the prefixed `webkitAnimationEnd` there instead of `animationend`.
 */
export function fireAnimationEnd(element: Element): void {
    fireEvent(element, new Event("webkitAnimationEnd", {bubbles: true}));
}
