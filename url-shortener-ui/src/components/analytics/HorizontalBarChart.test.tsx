import {render} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {HorizontalBarChart} from "@/components/analytics/HorizontalBarChart";
import {CHART_COLORS} from "@/lib/constants";

describe("HorizontalBarChart", () => {
    it("renders nothing and skips label rendering when there is no data", () => {
        const renderLabel = vi.fn();

        const {container} = render(
            <HorizontalBarChart data={[]} totalClicks={0} color={CHART_COLORS.DEVICES} renderLabel={renderLabel}/>,
        );

        expect(container).toBeEmptyDOMElement();
        expect(renderLabel).not.toHaveBeenCalled();
    });
});
