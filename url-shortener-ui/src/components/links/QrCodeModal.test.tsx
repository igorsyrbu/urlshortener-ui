import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {QrCodeModal} from "@/components/links/QrCodeModal";
import {logger} from "@/lib/logger";
import type {LinkItem} from "@/lib/types";
import {createLinkItem} from "@/test/link-utils";

interface QrOptions {
    data: string;
    width: number;
    height: number;
}

const qr = vi.hoisted(() => ({
    isDesktop: true,
    constructed: [] as unknown[],
    append: vi.fn(),
    update: vi.fn(),
    download: vi.fn(),
    getRawData: vi.fn(),
}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => qr.isDesktop,
    useIsMobile: () => !qr.isDesktop,
}));
vi.mock("qr-code-styling", () => ({
    default: class QRCodeStylingStub {
        append = qr.append;
        update = qr.update;
        download = qr.download;
        getRawData = qr.getRawData;

        constructor(options: unknown) {
            qr.constructed.push(options);
        }
    },
}));

const SVG_MARKUP = "<svg></svg>";
const PREVIEW_SIZE = 500;
const EXPORT_SIZE = 2048;

function renderModal(link: LinkItem | null = createLinkItem({title: "Launch page", shortUrl: "https://sho.rt/abc123"})): void {
    render(<QrCodeModal open onOpenChange={vi.fn()} link={link}/>);
}

function getConstructedOptions(): QrOptions[] {
    return qr.constructed as QrOptions[];
}

function getDesktopToolbarButtons(): {downloadTrigger: HTMLElement, copyTrigger: HTMLElement} {
    const [downloadTrigger, copyTrigger] = screen.getAllByRole("button");
    return {downloadTrigger, copyTrigger};
}

describe("QrCodeModal", () => {
    beforeEach(() => {
        qr.isDesktop = true;
        qr.constructed.length = 0;
        qr.download.mockResolvedValue(undefined);
        qr.getRawData.mockImplementation(async (extension: string) => new Blob([extension === "svg" ? SVG_MARKUP : "png-bytes"]));
    });

    describe("preview", () => {
        it("renders a preview QR code that encodes the short URL", async () => {
            renderModal();

            await waitFor(() => expect(qr.append).toHaveBeenCalledOnce());
            expect(getConstructedOptions()[0]).toMatchObject({data: "https://sho.rt/abc123", width: PREVIEW_SIZE, height: PREVIEW_SIZE});
            expect(qr.append.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
        });

        it("shows the link title with the full title available on hover", () => {
            const longTitle = "t".repeat(200);
            renderModal(createLinkItem({title: longTitle}));

            expect(screen.getByText(longTitle)).toHaveAttribute("title", longTitle);
        });

        it("does not build a QR code without a link", async () => {
            renderModal(null);

            await waitFor(() => expect(screen.getByRole("dialog", {name: "QR Code"})).toBeInTheDocument());
            expect(qr.constructed).toHaveLength(0);
        });
    });

    describe("downloading on desktop", () => {
        it.each(["PNG", "SVG"])("downloads a high resolution %s named after the short key", async (format) => {
            const user = userEvent.setup();
            renderModal();

            await user.click(getDesktopToolbarButtons().downloadTrigger);
            await user.click(await screen.findByRole("menuitem", {name: `Download ${format}`}));

            await waitFor(() => expect(qr.download).toHaveBeenCalledExactlyOnceWith({extension: format.toLowerCase(), name: "abc123-qrcode"}));
            expect(getConstructedOptions().at(-1)).toMatchObject({width: EXPORT_SIZE, height: EXPORT_SIZE});
        });
    });

    describe("copying on desktop", () => {
        it("copies the SVG markup as text when the browser cannot copy images", async () => {
            const user = userEvent.setup();
            renderModal();

            await user.click(getDesktopToolbarButtons().copyTrigger);
            await user.click(await screen.findByRole("menuitem", {name: "Copy SVG"}));

            await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(SVG_MARKUP));
            expect(qr.getRawData).toHaveBeenCalledWith("svg");
        });

        it("logs a failure when the QR data cannot be produced", async () => {
            const user = userEvent.setup();
            qr.getRawData.mockResolvedValue(null);
            const logError = vi.spyOn(logger, "error").mockImplementation(() => undefined);
            renderModal();

            await user.click(getDesktopToolbarButtons().copyTrigger);
            await user.click(await screen.findByRole("menuitem", {name: "Copy SVG"}));

            await waitFor(() => expect(logError).toHaveBeenCalledWith("Failed to copy svg (fallback)", expect.any(Error)));
        });
    });

    describe("on mobile", () => {
        beforeEach(() => { qr.isDesktop = false; });

        it.each([
            ["Download QR code", "Download as PNG", "png"],
            ["Download QR code", "Download as SVG", "svg"],
        ])("offers %s through an action drawer (%s)", async (triggerName, actionName, extension) => {
            const user = userEvent.setup();
            renderModal();

            await user.click(screen.getByRole("button", {name: triggerName}));
            await user.click(await screen.findByRole("button", {name: actionName}));

            await waitFor(() => expect(qr.download).toHaveBeenCalledWith({extension, name: "abc123-qrcode"}));
        });

        it("copies the SVG from the copy drawer", async () => {
            const user = userEvent.setup();
            renderModal();

            await user.click(screen.getByRole("button", {name: "Copy QR code"}));
            await user.click(await screen.findByRole("button", {name: "Copy as SVG"}));

            await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(SVG_MARKUP));
        });
    });
});
