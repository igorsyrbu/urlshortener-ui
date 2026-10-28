import {render} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Skeleton} from "@/components/ui/skeleton";
import {SkeletonText} from "@/components/ui/skeleton-text";

describe("Skeleton", () => {
    it("is hidden from assistive technology, so only the loading region's label is announced", () => {
        const {container} = render(<Skeleton className="h-9 w-32"/>);

        expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    });
});

describe("SkeletonText", () => {
    it("is hidden from assistive technology and holds one line of text, so it takes the surrounding line height", () => {
        const {container} = render(<p className="text-sm"><SkeletonText className="w-24"/></p>);
        const bar = container.querySelector("span");

        expect(bar).toHaveAttribute("aria-hidden", "true");
        expect(bar?.textContent).toBe(" ");
    });
});
