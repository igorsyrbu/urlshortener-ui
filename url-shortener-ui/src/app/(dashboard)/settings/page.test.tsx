import {describe, expect, it, vi} from "vitest";
import {redirect} from "next/navigation";
import SettingsPage from "@/app/(dashboard)/settings/page";
import {SETTINGS_ROUTES} from "@/lib/settings-constants";

vi.mock("next/navigation", () => ({redirect: vi.fn((): never => {throw new Error("Redirect");})}));

describe("SettingsPage", () => {
    it("redirects the Settings entry point to General", () => {
        expect(() => SettingsPage()).toThrow();

        expect(redirect).toHaveBeenCalledExactlyOnceWith(SETTINGS_ROUTES.GENERAL);
    });
});
