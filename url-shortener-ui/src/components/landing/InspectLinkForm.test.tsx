import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {useRouter} from "next/navigation";
import {describe, expect, it} from "vitest";
import {InspectLinkForm} from "@/components/landing/InspectLinkForm";
import {INSPECT_FORM_COPY} from "@/components/landing/landing-copy";
import {ROUTES} from "@/lib/constants";

function renderForm() {
    render(<InspectLinkForm/>);
    return userEvent.setup();
}

async function inspect(user: ReturnType<typeof userEvent.setup>, value: string): Promise<void> {
    if (value) await user.type(screen.getByLabelText(INSPECT_FORM_COPY.LABEL), value);
    await user.click(screen.getByRole("button", {name: INSPECT_FORM_COPY.SUBMIT}));
}

describe("InspectLinkForm", () => {
    it.each([
        ["a full short link", "https://sho.rt/abc123"],
        ["a short link without the scheme", "sho.rt/abc123"],
        ["a bare key", "abc123"],
    ])("opens the preview of the key for %s", async (_name, value) => {
        const user = renderForm();

        await inspect(user, value);

        expect(useRouter().push).toHaveBeenCalledExactlyOnceWith(ROUTES.INSPECT("abc123"));
    });

    it("asks for a link instead of navigating when the field is empty", async () => {
        const user = renderForm();

        await inspect(user, "");

        expect(screen.getByRole("alert")).toHaveTextContent(INSPECT_FORM_COPY.EMPTY);
        expect(screen.getByLabelText(INSPECT_FORM_COPY.LABEL)).toHaveAttribute("aria-invalid", "true");
        expect(useRouter().push).not.toHaveBeenCalled();
    });

    it("explains an invalid key and clears the message once the user edits it", async () => {
        const user = renderForm();
        await inspect(user, "not a key!");
        expect(screen.getByRole("alert")).toHaveTextContent("letters, numbers, and hyphens");

        await user.type(screen.getByLabelText(INSPECT_FORM_COPY.LABEL), "x");

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(useRouter().push).not.toHaveBeenCalled();
    });
});
