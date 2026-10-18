import {render, waitFor} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {CreateLinkModal} from "@/components/links/CreateLinkModal";

// The module factory runs on the first import only, so this check lives in its own file.
const confettiModule = vi.hoisted(() => ({loads: 0}));

vi.mock("canvas-confetti", () => {
    confettiModule.loads += 1;
    return {default: vi.fn()};
});
vi.mock("@/lib/hooks/useMediaQuery", () => ({useIsDesktop: () => true, useIsMobile: () => false}));
vi.mock("next/navigation", () => ({useRouter: () => ({push: vi.fn()}), usePathname: () => "/", useSearchParams: () => new URLSearchParams()}));
vi.mock("@/lib/api", () => ({fetchWithAuth: vi.fn(() => new Promise(() => undefined))}));

describe("CreateLinkModal confetti", () => {
    it("does not download the confetti while closed", async () => {
        render(<CreateLinkModal open={false} onOpenChange={vi.fn()}/>);

        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(confettiModule.loads).toBe(0);
    });

    it("starts downloading the confetti as soon as the dialog opens, before any link is created", async () => {
        render(<CreateLinkModal open onOpenChange={vi.fn()}/>);

        await waitFor(() => expect(confettiModule.loads).toBe(1));
    });
});
