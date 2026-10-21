import {render, screen} from "@testing-library/react";
import {useEffect, useRef} from "react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi} from "vitest";
import {SegmentedControl, type SegmentedControlOption} from "@/components/ui/segmented-control";
import {SEGMENTED_CONTROL_SELECTED_CLASS_NAME} from "@/components/ui/segmented-control-styles";

const BUTTON_OPTIONS: readonly SegmentedControlOption[] = [
    {value: "monthly", label: "Monthly"},
    {value: "yearly", label: "Yearly", suffix: <span>Save 17%</span>},
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

    it("shows the selection in the first painted frame, before the thumb is measured", () => {
        let selectedClassesAtFirstEffect: string[] = [];
        function PaintProbe() {
            const probeRef = useRef<HTMLDivElement>(null);
            // The first commit is what the browser paints first; its passive effect sees that DOM.
            useEffect(() => {
                const selected = probeRef.current?.querySelector("[aria-pressed='true']");
                selectedClassesAtFirstEffect = selected ? [...selected.classList] : [];
            }, []);
            return <div ref={probeRef}><SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/></div>;
        }

        render(<PaintProbe/>);

        expect(selectedClassesAtFirstEffect).toEqual(expect.arrayContaining(SEGMENTED_CONTROL_SELECTED_CLASS_NAME.split(" ")));
    });

    it("hands the selected background to the thumb once it is measured", () => {
        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);

        expect(screen.getByTestId("segmented-control-thumb")).toBeInTheDocument();
        expect(screen.getByRole("button", {name: "Monthly"})).not.toHaveClass(...SEGMENTED_CONTROL_SELECTED_CLASS_NAME.split(" "));
    });

    it("positions the indicator without a ResizeObserver", () => {
        vi.stubGlobal("ResizeObserver", undefined);

        render(<SegmentedControl ariaLabel="Billing cycle" value="monthly" options={BUTTON_OPTIONS}/>);

        expect(screen.getByTestId("segmented-control-thumb")).toBeInTheDocument();
    });
});
