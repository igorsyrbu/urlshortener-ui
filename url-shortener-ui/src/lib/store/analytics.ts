import {create} from "zustand";
import type {DateRange} from "react-day-picker";
import {type AnalyticsRange, customAnalyticsRange, presetAnalyticsRange} from "@/lib/analytics-api";

export type LocationTab = "countries" | "continents";
export type DeviceTab = "devices" | "os";

const DEFAULT_PERIOD = "P7D";

/** What the analytics page shows; the numbers themselves are queries keyed by `range` (`lib/query/analytics-queries.ts`). */
interface AnalyticsViewState {
    period: string;
    customDateRange: DateRange | undefined;
    /** What the queries load: the preset period, or the custom range once both of its ends are picked. */
    range: AnalyticsRange;
    locationTab: LocationTab;
    deviceTab: DeviceTab;
}

interface AnalyticsViewActions {
    setPeriod: (period: string) => void;
    setCustomDateRange: (range: DateRange | undefined) => void;
    setLocationTab: (tab: LocationTab) => void;
    setDeviceTab: (tab: DeviceTab) => void;
}

export const useAnalyticsStore = create<AnalyticsViewState & AnalyticsViewActions>((set) => ({
    period: DEFAULT_PERIOD,
    customDateRange: undefined,
    range: presetAnalyticsRange(DEFAULT_PERIOD),
    locationTab: "countries",
    deviceTab: "devices",

    setPeriod: (period) => set({period, range: presetAnalyticsRange(period)}),

    setCustomDateRange: (customDateRange) => {
        if (!customDateRange?.from || !customDateRange.to) {
            set({customDateRange});
            return;
        }
        set({customDateRange, period: "custom", range: customAnalyticsRange(customDateRange.from, customDateRange.to)});
    },

    setLocationTab: (locationTab) => set({locationTab}),

    setDeviceTab: (deviceTab) => set({deviceTab}),
}));
