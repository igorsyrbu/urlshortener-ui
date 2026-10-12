import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {LinksPagination} from "@/components/links/LinksPagination";

const PAGE_SIZE = 20;

interface PaginationProps {
    page: number;
    totalElements: number;
    isLoading: boolean;
}

interface PaginationHandlers {
    onPrevious: ReturnType<typeof vi.fn<() => void>>;
    onNext: ReturnType<typeof vi.fn<() => void>>;
}

function renderPagination(props: Partial<PaginationProps> = {}): PaginationHandlers {
    const handlers: PaginationHandlers = {onPrevious: vi.fn(), onNext: vi.fn()};
    render(<LinksPagination page={0} pageSize={PAGE_SIZE} totalElements={45} isLoading={false} {...props} {...handlers}/>);
    return handlers;
}

const previousButton = (): HTMLElement => screen.getByRole("button", {name: "Go to previous page"});
const nextButton = (): HTMLElement => screen.getByRole("button", {name: "Go to next page"});

describe("LinksPagination", () => {
    it.each([
        [0, 45, "1-20 of 45 links"],
        [1, 45, "21-40 of 45 links"],
        [2, 45, "41-45 of 45 links"],
        [0, 1, "1 of 1 link"],
        [0, 20, "1-20 of 20 links"],
    ])("labels page %i of %i links as %s", (page, totalElements, label) => {
        renderPagination({page, totalElements});

        expect(screen.getByText(label)).toBeInTheDocument();
        expect(screen.getByText(label)).toHaveAttribute("title", label);
    });

    it("disables previous on the first page", () => {
        renderPagination({page: 0});

        expect(previousButton()).toBeDisabled();
        expect(nextButton()).toBeEnabled();
    });

    it("disables next on the last page", () => {
        renderPagination({page: 2});

        expect(previousButton()).toBeEnabled();
        expect(nextButton()).toBeDisabled();
    });

    it("disables next when the results fill the page exactly", () => {
        renderPagination({page: 0, totalElements: PAGE_SIZE});

        expect(nextButton()).toBeDisabled();
    });

    it("disables both directions while loading", () => {
        renderPagination({page: 1, isLoading: true});

        expect(previousButton()).toBeDisabled();
        expect(nextButton()).toBeDisabled();
    });

    it("moves in the pressed direction", async () => {
        const user = userEvent.setup();
        const {onPrevious, onNext} = renderPagination({page: 1});

        await user.click(nextButton());
        await user.click(previousButton());

        expect(onNext).toHaveBeenCalledOnce();
        expect(onPrevious).toHaveBeenCalledOnce();
    });

    it("exposes the pagination landmark", () => {
        renderPagination();

        expect(screen.getByRole("navigation", {name: "Links pagination"})).toBeInTheDocument();
    });
});
