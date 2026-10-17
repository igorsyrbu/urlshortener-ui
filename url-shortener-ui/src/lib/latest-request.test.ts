import {describe, expect, it} from "vitest";
import {createLatestRequestTracker} from "@/lib/latest-request";

describe("createLatestRequestTracker", () => {
    it("treats a request as the latest until another one starts", () => {
        const tracker = createLatestRequestTracker();

        const first = tracker.begin();
        expect(first.isLatest()).toBe(true);

        const second = tracker.begin();
        expect(first.isLatest()).toBe(false);
        expect(second.isLatest()).toBe(true);
    });

    it("aborts the previous request when a new one starts", () => {
        const tracker = createLatestRequestTracker();
        const first = tracker.begin();

        const second = tracker.begin();

        expect(first.signal.aborted).toBe(true);
        expect(second.signal.aborted).toBe(false);
    });

    it("keeps separate trackers independent", () => {
        const linksRequests = createLatestRequestTracker();
        const tagsRequests = createLatestRequestTracker();
        const linksRequest = linksRequests.begin();

        tagsRequests.begin();

        expect(linksRequest.isLatest()).toBe(true);
    });
});
