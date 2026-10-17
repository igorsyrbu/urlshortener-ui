import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {SegmentedControl, type SegmentedControlOption} from "@/components/ui/segmented-control";

const BUTTON_OPTIONS: readonly SegmentedControlOption[] = [
    {value: "monthly", label: "Monthly"},
    {value: "yearly", label: "Yearly", suffix: <span>Save 17%</span>},
];

const LINK_OPTIONS: readonly SegmentedControlOption[] = [
    {value: "/settings/general", label: "General", href: "/settings/general"},
    {value: "/settings/appearence", label: "Appearance", href: "/settings/appearence"},
    {value: "/settings/billing", label: "Billing", href: "/settings/billing"},
];

const LONG_LABEL = "l".repeat(250);

function stubGeometry(element: HTMLElement, x: number, width: number): void {
    Object.defineProperty(element, "offsetLeft", {configurable: true, value: x});
    Object.defineProperty(element, "offsetWidth", {configurable: true, value: width});
}

describe("SegmentedControl buttons", () => {
    it("marks only the current value as pressed", () => {
        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);

        expect(screen.getByRole("button", {name: "Monthly"})).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", {name: "Yearly Save 17%"})).toHaveAttribute("aria-pressed", "false");
    });

    it("notifies the selected value exactly once", async () => {
        const onValueChange = vi.fn<(value: string) => void>();
        const user = userEvent.setup();
        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" onValueChange={onValueChange} options={BUTTON_OPTIONS}/>);

        await user.click(screen.getByRole("button", {name: "Yearly Save 17%"}));

        expect(onValueChange).toHaveBeenCalledExactlyOnceWith("yearly");
    });

    it("ignores clicks while disabled", async () => {
        const onValueChange = vi.fn<(value: string) => void>();
        const user = userEvent.setup();
        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" isDisabled onValueChange={onValueChange} options={BUTTON_OPTIONS}/>);

        await user.click(screen.getByRole("button", {name: "Yearly Save 17%"}));

        expect(onValueChange).not.toHaveBeenCalled();
        expect(screen.getByRole("button", {name: "Yearly Save 17%"})).toBeDisabled();
    });

    it("reports intent when the pointer enters or focus reaches an option, before any click", async () => {
        const onIntent = vi.fn<() => void>();
        const onValueChange = vi.fn<(value: string) => void>();
        const user = userEvent.setup();
        const options = [BUTTON_OPTIONS[0], {...BUTTON_OPTIONS[1], onIntent}];
        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" onValueChange={onValueChange} options={options}/>);

        await user.hover(screen.getByRole("button", {name: "Yearly Save 17%"}));
        expect(onIntent).toHaveBeenCalledOnce();
        await user.tab();
        await user.tab();

        expect(onIntent).toHaveBeenCalledTimes(2);
        expect(onValueChange).not.toHaveBeenCalled();
    });

    it("moves keyboard focus through every option", async () => {
        const user = userEvent.setup();
        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);

        await user.tab();
        expect(screen.getByRole("button", {name: "Monthly"})).toHaveFocus();

        await user.tab();
        expect(screen.getByRole("button", {name: "Yearly Save 17%"})).toHaveFocus();
    });

    it("exposes a long label in full for hover and touch", () => {
        render(<SegmentedControl ariaLabel="Billing cycle" value="long" options={[{value: "long", label: LONG_LABEL}]}/>);

        expect(screen.getByTitle(LONG_LABEL)).toHaveTextContent(LONG_LABEL);
    });
});

describe("SegmentedControl indicator", () => {
    it("moves the indicator to the newly selected option", () => {
        const {rerender} = render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);
        stubGeometry(screen.getByRole("button", {name: "Monthly"}), 4, 100);
        stubGeometry(screen.getByRole("button", {name: "Yearly Save 17%"}), 108, 140);

        rerender(<SegmentedControl ariaLabel="Billing cycle" value="yearly" options={BUTTON_OPTIONS}/>);

        const thumb = screen.getByTestId("segmented-control-thumb");
        expect(thumb.style.transform).toBe("translateX(108px)");
        expect(thumb.style.width).toBe("140px");
    });

    it("keeps the indicator mounted when switching back to the first option", () => {
        const {rerender} = render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);
        stubGeometry(screen.getByRole("button", {name: "Monthly"}), 4, 100);
        stubGeometry(screen.getByRole("button", {name: "Yearly Save 17%"}), 108, 140);
        rerender(<SegmentedControl ariaLabel="Billing cycle" value="yearly" options={BUTTON_OPTIONS}/>);
        const thumb = screen.getByTestId("segmented-control-thumb");

        rerender(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);

        expect(screen.getByTestId("segmented-control-thumb")).toBe(thumb);
        expect(thumb.style.transform).toBe("translateX(4px)");
        expect(thumb.style.width).toBe("100px");
    });

    it("hides the indicator when nothing is selected", () => {
        render(<SegmentedControl ariaLabel="Billing cycle" value="unknown" options={BUTTON_OPTIONS}/>);

        expect(screen.queryByTestId("segmented-control-thumb")).not.toBeInTheDocument();
    });

    it("positions the indicator without a ResizeObserver", () => {
        vi.stubGlobal("ResizeObserver", undefined);

        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);

        expect(screen.getByTestId("segmented-control-thumb")).toBeInTheDocument();
    });
});

describe("SegmentedControl links", () => {
    it("links every section to its route and marks only the current one", () => {
        render(<SegmentedControl ariaLabel="Settings sections" value="/settings/general" options={LINK_OPTIONS}/>);

        expect(screen.getByRole("link", {name: "Appearance"})).toHaveAttribute("href", "/settings/appearence");
        const currentLinks = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
        expect(currentLinks).toHaveLength(1);
        expect(currentLinks[0]).toHaveTextContent("General");
    });

    it("reports intent on a link before it is followed", async () => {
        const onIntent = vi.fn<() => void>();
        const user = userEvent.setup();
        const options = LINK_OPTIONS.map((option) => (option.label === "Billing" ? {...option, onIntent} : option));
        render(<SegmentedControl ariaLabel="Settings sections" value="/settings/general" options={options}/>);

        await user.hover(screen.getByRole("link", {name: "Billing"}));

        expect(onIntent).toHaveBeenCalledOnce();
    });

    it("follows the current route when it changes", () => {
        const {rerender} = render(<SegmentedControl ariaLabel="Settings sections" value="/settings/billing" options={LINK_OPTIONS}/>);
        rerender(<SegmentedControl ariaLabel="Settings sections" value="/settings/general" options={LINK_OPTIONS}/>);

        expect(screen.getByRole("link", {name: "General"})).toHaveAttribute("aria-current", "page");
        expect(screen.getByRole("link", {name: "Billing"})).not.toHaveAttribute("aria-current");
    });
});
