import {act, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {toast} from "sonner";
import {Toaster} from "@/components/ui/sonner";

function getToaster(): HTMLElement {
    const toaster = document.querySelector<HTMLElement>("[data-sonner-toaster]");
    if (!toaster) throw new Error("The toaster is not mounted");
    return toaster;
}

describe("Toaster", () => {
    it.each([
        ["success", "Link archived", "--success"],
        ["error", "Couldn't delete the link.", "--destructive"],
    ] as const)("colours a %s toast from the theme's intent token", async (type, message, token) => {
        render(<Toaster/>);

        act(() => {
            toast[type](message);
        });

        const toastElement = (await screen.findByText(message)).closest("[data-sonner-toast]");
        expect(toastElement).toHaveAttribute("data-type", type);
        expect(toastElement).toHaveAttribute("data-rich-colors", "true");
        const variablePrefix = type === "success" ? "--success" : "--error";
        expect(getToaster().style.getPropertyValue(`${variablePrefix}-bg`)).toContain(`var(${token})`);
        expect(getToaster().style.getPropertyValue(`${variablePrefix}-text`)).toContain(`var(${token})`);
    });

    it("keeps info toasts on the plain popover surface", async () => {
        render(<Toaster/>);

        act(() => {
            toast.info("Showing archived links");
        });

        await screen.findByText("Showing archived links");
        expect(getToaster().style.getPropertyValue("--info-bg")).toBe("var(--popover)");
    });
});
