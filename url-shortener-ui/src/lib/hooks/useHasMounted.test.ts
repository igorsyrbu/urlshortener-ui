import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useHasMounted} from "@/lib/hooks/useHasMounted";

describe("useHasMounted", () => {
    it("is true on the first client render, without an effect re-render", () => {
        const renderValues: boolean[] = [];

        renderHook(() => {
            const hasMounted = useHasMounted();
            renderValues.push(hasMounted);
            return hasMounted;
        });

        expect(renderValues).toEqual([true]);
    });
});
