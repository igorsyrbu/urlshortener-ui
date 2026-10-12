import type {ReactElement} from "react";
import type {BarLabelProps} from "@/components/analytics/HorizontalBarChart";
import type {AnalyticsGroupedClick} from "@/lib/store/analytics";

interface MockBarChartItem {
    name: string;
    clicks: number;
}

interface MockHorizontalBarChartProps {
    data: MockBarChartItem[];
    totalClicks: number;
    color: string;
    renderLabel: (props: BarLabelProps) => ReactElement;
}

const MOCK_BAR_HEIGHT = 40;

export function MockHorizontalBarChart({data, totalClicks, color, renderLabel}: MockHorizontalBarChartProps): ReactElement {
    return (
        <svg data-testid="bar-chart" data-color={color} data-total-clicks={totalClicks}>
            {data.map((item) => (
                <g key={item.name} data-testid="bar-row" data-clicks={item.clicks}>
                    {renderLabel({x: 0, y: 0, width: 0, height: MOCK_BAR_HEIGHT, value: item.name})}
                </g>
            ))}
        </svg>
    );
}

export function createGroupedClick(overrides: Partial<AnalyticsGroupedClick> = {}): AnalyticsGroupedClick {
    return {label: "Desktop", clicks: 10, ...overrides};
}
