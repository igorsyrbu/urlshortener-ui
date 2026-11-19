import {fireEvent} from "@testing-library/react";

/**
 * Ends a CSS animation for a React `onAnimationEnd` handler. jsdom has no `AnimationEvent` but does have
 * `WebkitAnimation`, so React listens for the prefixed `webkitAnimationEnd` there instead of `animationend`.
 */
export function fireAnimationEnd(element: Element, animationName = ""): void {
    const event = new Event("webkitAnimationEnd", {bubbles: true});
    // A browser's AnimationEvent names the animation that ended; handlers that filter by it need the same here.
    Object.defineProperty(event, "animationName", {value: animationName});
    fireEvent(element, event);
}
