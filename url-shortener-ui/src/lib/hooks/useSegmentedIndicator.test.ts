import {act, renderHook, type RenderHookResult} from "@testing-library/react";
import type {RefObject} from "react";
import {describe, expect, it, vi} from "vitest";
import {useSegmentedIndicator, type SegmentedIndicator} from "@/lib/hooks/useSegmentedIndicator";

const FIRST_OPTION = {value: "first", x: 4, width: 100};
const SECOND_OPTION = {value: "second", x: 108, width: 140};
const RESIZED_OPTION = {value: "second", x: 124, width: 156};

interface OptionGeometry {
    value: string;
    x: number;
    width: number;
}

interface IndicatorTestResult extends RenderHookResult<SegmentedIndicator, string> {
    element: HTMLElement;
    container: HTMLElement;
    selectedRef: RefObject<HTMLElement | null>;
}

function setGeometry(element: HTMLElement, geometry: OptionGeometry): void {
    Object.defineProperty(element, "offsetLeft", {configurable: true, value: geometry.x});
    Object.defineProperty(element, "offsetWidth", {configurable: true, value: geometry.width});
}

const observedElements: Element[] = [];

function stubResizeObserver(): () => void {
    let notifyResize = (): void => undefined;
    observedElements.length = 0;
    vi.stubGlobal("ResizeObserver", vi.fn(function (callback: ResizeObserverCallback): ResizeObserver {
        const observer: ResizeObserver = {
            observe: vi.fn((element: Element) => { observedElements.push(element); }), unobserve: vi.fn(), disconnect: vi.fn(),
        };
        notifyResize = (): void => callback([], observer);
        return observer;
    }));
    return (): void => act(() => notifyResize());
}

function renderIndicator(): IndicatorTestResult {
    const element = document.createElement("button");
    setGeometry(element, FIRST_OPTION);
    const container = document.createElement("div");
    const selectedRef: RefObject<HTMLElement | null> = {current: element};
    const containerRef: RefObject<HTMLElement | null> = {current: container};
    const hook = renderHook((value: string) => useSegmentedIndicator(selectedRef, containerRef, value), {
        initialProps: FIRST_OPTION.value,
    });
    return {...hook, element, container, selectedRef};
}

describe("useSegmentedIndicator", () => {
    it("positions the initial selection without animating", () => {
        const {result} = renderIndicator();

        expect(result.current).toEqual({x: FIRST_OPTION.x, width: FIRST_OPTION.width, isReady: true, shouldAnimate: false});
    });

    it("keeps selection changes animated after the observer reports unchanged geometry", () => {
        const notifyResize = stubResizeObserver();
        const {result, rerender, element} = renderIndicator();

        setGeometry(element, SECOND_OPTION);
        rerender(SECOND_OPTION.value);
        notifyResize();

        expect(result.current).toEqual({x: SECOND_OPTION.x, width: SECOND_OPTION.width, isReady: true, shouldAnimate: true});
    });

    it("keeps backward selection changes animated after the observer reports unchanged geometry", () => {
        const notifyResize = stubResizeObserver();
        const {result, rerender, element} = renderIndicator();
        setGeometry(element, SECOND_OPTION);
        rerender(SECOND_OPTION.value);
        notifyResize();

        setGeometry(element, FIRST_OPTION);
        rerender(FIRST_OPTION.value);
        notifyResize();

        expect(result.current).toEqual({x: FIRST_OPTION.x, width: FIRST_OPTION.width, isReady: true, shouldAnimate: true});
    });

    it("realigns without animation when the selected option resizes", () => {
        const notifyResize = stubResizeObserver();
        const {result, rerender, element} = renderIndicator();
        setGeometry(element, SECOND_OPTION);
        rerender(SECOND_OPTION.value);

        setGeometry(element, RESIZED_OPTION);
        notifyResize();

        expect(result.current).toEqual({x: RESIZED_OPTION.x, width: RESIZED_OPTION.width, isReady: true, shouldAnimate: false});
    });

    it("realigns when an earlier option changes width and the selected one keeps its own", () => {
        const notifyResize = stubResizeObserver();
        const {result, rerender, element, container} = renderIndicator();
        setGeometry(element, SECOND_OPTION);
        rerender(SECOND_OPTION.value);

        setGeometry(element, {...SECOND_OPTION, x: SECOND_OPTION.x + 20});
        notifyResize();

        expect(observedElements).toContain(container);
        expect(result.current.x).toBe(SECOND_OPTION.x + 20);
    });

    it("positions a selection that reappears without animating from a hidden indicator", () => {
        const {result, rerender, element, selectedRef} = renderIndicator();
        selectedRef.current = null;
        rerender("unknown");
        expect(result.current.isReady).toBe(false);

        selectedRef.current = element;
        rerender(FIRST_OPTION.value);

        expect(result.current).toEqual({x: FIRST_OPTION.x, width: FIRST_OPTION.width, isReady: true, shouldAnimate: false});
    });
});
