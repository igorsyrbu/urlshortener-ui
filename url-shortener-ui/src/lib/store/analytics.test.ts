import {afterEach, describe, expect, it} from "vitest";
import {useAnalyticsStore} from "@/lib/store/analytics";

const initialState = useAnalyticsStore.getInitialState();

describe("analytics view store", () => {
    afterEach(() => {
        useAnalyticsStore.setState(initialState, true);
    });

    it("starts on the last 7 days with the countries and devices tabs", () => {
        const state = useAnalyticsStore.getState();

        expect(state).toMatchObject({period: "P7D", range: {period: "P7D"}, locationTab: "countries", deviceTab: "devices"});
    });

    it("loads a picked preset period", () => {
        useAnalyticsStore.getState().setPeriod("P30D");

        expect(useAnalyticsStore.getState()).toMatchObject({period: "P30D", range: {period: "P30D"}});
    });

    it("switches to a custom period with the picked local days once both ends are picked", () => {
        const from = new Date(2026, 8, 1);
        const to = new Date(2026, 8, 15);

        useAnalyticsStore.getState().setCustomDateRange({from, to});

        expect(useAnalyticsStore.getState()).toMatchObject({
            period: "custom", customDateRange: {from, to}, range: {start: "2026-09-01", end: "2026-09-15"},
        });
    });

    it("keeps loading the current range while only one end of a custom range is picked", () => {
        const from = new Date(2026, 8, 1);

        useAnalyticsStore.getState().setCustomDateRange({from, to: undefined});

        expect(useAnalyticsStore.getState()).toMatchObject({period: "P7D", customDateRange: {from}, range: {period: "P7D"}});
    });

    it("keeps loading the current range when the custom range is cleared", () => {
        useAnalyticsStore.getState().setCustomDateRange(undefined);

        expect(useAnalyticsStore.getState()).toMatchObject({customDateRange: undefined, range: {period: "P7D"}});
    });

    it("remembers the selected location and device tabs", () => {
        useAnalyticsStore.getState().setLocationTab("continents");
        useAnalyticsStore.getState().setDeviceTab("os");

        expect(useAnalyticsStore.getState()).toMatchObject({locationTab: "continents", deviceTab: "os"});
    });
});
