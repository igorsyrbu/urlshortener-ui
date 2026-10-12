import {describe, expect, it, vi} from "vitest";
import Home from "@/app/page";
import {ROUTES} from "@/lib/constants";

const mocks = vi.hoisted(() => ({redirect: vi.fn()}));
vi.mock("next/navigation", () => ({redirect: mocks.redirect}));

describe("Home", () => {
    it("redirects to the links page", () => {
        Home();

        expect(mocks.redirect).toHaveBeenCalledExactlyOnceWith(ROUTES.LINKS);
    });
});
