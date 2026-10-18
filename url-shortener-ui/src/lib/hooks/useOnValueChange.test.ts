import {renderHook} from "@testing-library/react";
import {useLayoutEffect, useState} from "react";
import {describe, expect, it, vi} from "vitest";
import {useOnValueChange} from "@/lib/hooks/useOnValueChange";

describe("useOnValueChange", () => {
    it("does not report the first value", () => {
        const onChange = vi.fn();

        renderHook(() => useOnValueChange("a", onChange));

        expect(onChange).not.toHaveBeenCalled();
    });

    it("reports a changed value once, with the previous one", () => {
        const onChange = vi.fn();
        const {rerender} = renderHook(({value}) => useOnValueChange(value, onChange), {initialProps: {value: "a"}});

        rerender({value: "b"});
        rerender({value: "b"});

        expect(onChange).toHaveBeenCalledExactlyOnceWith("b", "a");
    });

    it("updates the component's state before the changed value is committed", () => {
        const committed: string[] = [];
        const {rerender} = renderHook(({source}) => {
            const [draft, setDraft] = useState(source);
            useOnValueChange(source, (nextSource) => setDraft(nextSource));
            useLayoutEffect(() => {
                committed.push(`${source}:${draft}`);
            });
        }, {initialProps: {source: "first"}});

        rerender({source: "second"});

        expect(committed).toEqual(["first:first", "second:second"]);
    });
});
