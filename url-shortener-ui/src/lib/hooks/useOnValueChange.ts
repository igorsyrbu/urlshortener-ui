"use client";

import {useState} from "react";

/**
 * Calls `onChange` during render when `value` differs from the previous render's value (`Object.is`). Use it to reset
 * or copy state when a prop changes: React re-renders the component before painting, so the stale state is never
 * shown, unlike a `setState` inside an effect, which paints once with the old state and renders again.
 * `onChange` may only update the calling component's own state.
 */
export function useOnValueChange<T>(value: T, onChange: (value: T, previousValue: T) => void): void {
    const [previousValue, setPreviousValue] = useState(value);
    if (!Object.is(previousValue, value)) {
        setPreviousValue(value);
        onChange(value, previousValue);
    }
}
