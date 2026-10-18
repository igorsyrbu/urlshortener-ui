import {act, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {LinkCard} from "@/components/links/LinkCard";
import {toast} from "sonner";
import {COPY_FAILED_MESSAGE, COPY_FEEDBACK_DURATION_MS} from "@/lib/constants";
import {useTagStoreWithoutCount} from "@/lib/store/tags";
import type {LinkItem} from "@/lib/types";
import {createLinkItem} from "@/test/link-utils";
import {createTag} from "@/test/tag-utils";

const media = vi.hoisted(() => ({isDesktop: true}));
const qrCodePreload = vi.hoisted(() => ({preloadQrCodeModal: vi.fn()}));

vi.mock("@/lib/hooks/useMediaQuery", () => ({
    useIsDesktop: () => media.isDesktop,
    useIsMobile: () => !media.isDesktop,
}));

vi.mock("@/components/links/lazy-qr-code-modal", () => qrCodePreload);

interface CardHandlers {
    onEdit: ReturnType<typeof vi.fn<(link: LinkItem) => void>>;
    onDelete: ReturnType<typeof vi.fn<(link: LinkItem) => void>>;
    onQrCode: ReturnType<typeof vi.fn<(link: LinkItem) => void>>;
    onArchiveRequest: ReturnType<typeof vi.fn<(link: LinkItem) => void>>;
}

function renderCard(link: LinkItem, withArchive = true): CardHandlers {
    const handlers: CardHandlers = {onEdit: vi.fn(), onDelete: vi.fn(), onQrCode: vi.fn(), onArchiveRequest: vi.fn()};
    render(
        <LinkCard
            link={link}
            onEdit={handlers.onEdit}
            onDelete={handlers.onDelete}
            onQrCode={handlers.onQrCode}
            onArchiveRequest={withArchive ? handlers.onArchiveRequest : undefined}
        />,
    );
    return handlers;
}

async function openActions(user: ReturnType<typeof userEvent.setup>): Promise<void> {
    await user.click(screen.getByRole("button", {name: "More actions for link"}));
}

describe.each([
    {layout: "desktop menu", isDesktop: true},
    {layout: "mobile drawer", isDesktop: false},
])("LinkCard QR code preload in the $layout", ({isDesktop}) => {
    beforeEach(() => {
        media.isDesktop = isDesktop;
        useTagStoreWithoutCount.setState({tags: [], loading: false, error: null});
    });

    it("starts loading the QR code dialog when the action menu opens, not before", async () => {
        const user = userEvent.setup();
        renderCard(createLinkItem());
        expect(qrCodePreload.preloadQrCodeModal).not.toHaveBeenCalled();

        await openActions(user);

        expect(qrCodePreload.preloadQrCodeModal).toHaveBeenCalledOnce();
    });
});

describe("LinkCard", () => {
    beforeEach(() => {
        media.isDesktop = true;
        useTagStoreWithoutCount.setState({tags: [], loading: false, error: null});
    });

    afterEach(() => { vi.useRealTimers(); });

    describe("content", () => {
        it("shows the title, short URL and destination domain", () => {
            renderCard(createLinkItem({title: "My article", shortUrl: "https://sho.rt/abc", longUrl: "https://www.example.com/a/b?x=1"}));

            expect(screen.getByRole("heading", {name: "My article"})).toBeInTheDocument();
            expect(screen.getByText("https://sho.rt/abc")).toBeInTheDocument();
            expect(screen.getByText("www.example.com")).toBeInTheDocument();
        });

        it("reveals the full destination URL on hover", async () => {
            const user = userEvent.setup();
            const link = createLinkItem({longUrl: "https://example.com/very/long/path?with=query"});
            renderCard(link);

            await user.hover(screen.getByText("example.com"));

            expect(await screen.findByRole("tooltip")).toHaveTextContent(link.longUrl);
        });

        it("falls back to the raw destination when it is not a valid URL", () => {
            renderCard(createLinkItem({longUrl: "not a url"}));

            expect(screen.getByText("not a url")).toBeInTheDocument();
        });
    });

    describe("tags", () => {
        it("renders nothing for tags that are missing from the store", () => {
            renderCard(createLinkItem({tagIds: ["ghost"]}));

            expect(screen.queryByText(/\+\d/)).not.toBeInTheDocument();
        });

        it("shows a single tag by name", () => {
            useTagStoreWithoutCount.setState({tags: [createTag({id: "t1", name: "Marketing"})]});

            renderCard(createLinkItem({tagIds: ["t1"]}));

            expect(screen.getByText("Marketing")).toBeInTheDocument();
        });

        it("shows the first tag alphabetically with a counter and lists the others on hover", async () => {
            const user = userEvent.setup();
            useTagStoreWithoutCount.setState({tags: [
                createTag({id: "t1", name: "Zeta"}),
                createTag({id: "t2", name: "Alpha"}),
                createTag({id: "t3", name: "Beta"}),
            ]});
            renderCard(createLinkItem({tagIds: ["t1", "t2", "t3"]}));

            await user.hover(screen.getByText("+2"));

            expect(screen.getByText("Alpha")).toBeInTheDocument();
            expect(screen.getByText("Beta")).toBeInTheDocument();
            expect(screen.getByText("Zeta")).toBeInTheDocument();
        });
    });

    describe("copying", () => {
        it("copies the short URL and confirms, then restores the button", async () => {
            vi.useFakeTimers({shouldAdvanceTime: true});
            const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
            renderCard(createLinkItem({shortUrl: "https://sho.rt/abc"}));

            await user.click(screen.getByRole("button", {name: "Copy link to clipboard"}));

            expect(await navigator.clipboard.readText()).toBe("https://sho.rt/abc");
            expect(screen.getByRole("button", {name: "Link copied"})).toBeInTheDocument();
            await act(() => vi.advanceTimersByTimeAsync(COPY_FEEDBACK_DURATION_MS));
            expect(screen.getByRole("button", {name: "Copy link to clipboard"})).toBeInTheDocument();
        });

        it("does not confirm and shows an error toast when copying fails", async () => {
            const user = userEvent.setup();
            const showError = vi.spyOn(toast, "error");
            vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("denied"));
            renderCard(createLinkItem({shortUrl: "https://sho.rt/abc"}));

            await user.click(screen.getByRole("button", {name: "Copy link to clipboard"}));

            expect(showError).toHaveBeenCalledExactlyOnceWith(COPY_FAILED_MESSAGE);
            expect(screen.queryByRole("button", {name: "Link copied"})).not.toBeInTheDocument();
        });
    });

    describe("actions menu on desktop", () => {
        it.each([
            ["Edit", "onEdit"],
            ["QR Code", "onQrCode"],
            ["Archive", "onArchiveRequest"],
            ["Delete", "onDelete"],
        ] as const)("runs %s for the link", async (label, handlerName) => {
            const user = userEvent.setup();
            const link = createLinkItem();
            const handlers = renderCard(link);

            await openActions(user);
            await user.click(await screen.findByRole("menuitem", {name: new RegExp(label)}));

            expect(handlers[handlerName]).toHaveBeenCalledExactlyOnceWith(link);
        });

        it("offers to unarchive an archived link", async () => {
            const user = userEvent.setup();
            renderCard(createLinkItem({isActive: false}));

            await openActions(user);

            expect(await screen.findByRole("menuitem", {name: /Unarchive/})).toBeInTheDocument();
        });

        it("hides the archive action when archiving is not supported by the parent", async () => {
            const user = userEvent.setup();
            renderCard(createLinkItem(), false);

            await openActions(user);
            await screen.findByRole("menuitem", {name: /Edit/});

            expect(screen.queryByRole("menuitem", {name: /Archive/})).not.toBeInTheDocument();
        });
    });

    describe("actions menu on mobile", () => {
        it.each([
            ["Edit", "onEdit"],
            ["QR Code", "onQrCode"],
            ["Archive", "onArchiveRequest"],
            ["Delete", "onDelete"],
        ] as const)("runs %s from the action drawer", async (label, handlerName) => {
            media.isDesktop = false;
            const user = userEvent.setup();
            const link = createLinkItem();
            const handlers = renderCard(link);

            await openActions(user);
            await user.click(await screen.findByRole("button", {name: label}));

            expect(handlers[handlerName]).toHaveBeenCalledExactlyOnceWith(link);
        });
    });

    describe("keyboard shortcuts while the actions menu is open", () => {
        it.each([
            ["e", "onEdit"],
            ["q", "onQrCode"],
            ["d", "onDelete"],
        ] as const)("runs the action bound to %s", async (key, handlerName) => {
            const user = userEvent.setup();
            const link = createLinkItem();
            const handlers = renderCard(link);
            await openActions(user);
            await screen.findByRole("menu");

            await user.keyboard(key);

            expect(handlers[handlerName]).toHaveBeenCalledExactlyOnceWith(link);
        });

        it("ignores shortcuts when the card is neither hovered nor has its menu open", async () => {
            const user = userEvent.setup();
            const handlers = renderCard(createLinkItem());

            await user.keyboard("e");

            expect(handlers.onEdit).not.toHaveBeenCalled();
        });

        it("ignores shortcuts typed into inputs", async () => {
            const user = userEvent.setup();
            const handlers = renderCard(createLinkItem());
            render(<input aria-label="Search"/>);
            await openActions(user);

            fireEvent.keyDown(screen.getByLabelText("Search"), {key: "e"});

            expect(handlers.onEdit).not.toHaveBeenCalled();
        });
    });
});
