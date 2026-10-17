import type {Metadata} from "next";
import {describe, expect, it} from "vitest";
import {metadata as linksMetadata} from "@/app/(dashboard)/links/layout";
import {metadata as tagsMetadata} from "@/app/(dashboard)/tags/layout";
import {metadata as analyticsMetadata} from "@/app/(dashboard)/analytics/layout";
import {metadata as dashboardMetadata} from "@/app/(dashboard)/dashboard/page";
import {metadata as generalSettingsMetadata} from "@/app/(dashboard)/settings/general/layout";
import {metadata as billingSettingsMetadata} from "@/app/(dashboard)/settings/billing/page";
import {metadata as loginMetadata} from "@/app/login/layout";
import {metadata as authMetadata} from "@/app/auth/layout";
import {metadata as reportAbuseMetadata} from "@/app/(legal)/report-abuse/page";
import {metadata as inspectMetadata} from "@/app/inspect/[key]/page";
import {PAGE_TITLES} from "@/lib/constants";
import {SETTINGS_LABELS} from "@/lib/settings-constants";

describe("route titles", () => {
    it.each<[string, Metadata, string]>([
        ["links", linksMetadata, PAGE_TITLES.LINKS],
        ["tags", tagsMetadata, PAGE_TITLES.TAGS],
        ["analytics", analyticsMetadata, PAGE_TITLES.ANALYTICS],
        ["dashboard", dashboardMetadata, PAGE_TITLES.DASHBOARD],
        ["general settings", generalSettingsMetadata, `${SETTINGS_LABELS.GENERAL} · ${PAGE_TITLES.SETTINGS}`],
        ["billing settings", billingSettingsMetadata, `${SETTINGS_LABELS.BILLING} · ${PAGE_TITLES.SETTINGS}`],
        ["login", loginMetadata, PAGE_TITLES.LOGIN],
        ["sign-in callbacks", authMetadata, PAGE_TITLES.SIGNING_IN],
        ["report abuse", reportAbuseMetadata, PAGE_TITLES.REPORT_ABUSE],
        ["link preview", inspectMetadata, PAGE_TITLES.LINK_PREVIEW],
    ])("gives the %s page its own title", (_route, metadata, expected) => {
        expect(metadata.title).toBe(expected);
    });

    it("gives every route a different title", () => {
        const titles = [linksMetadata, tagsMetadata, analyticsMetadata, dashboardMetadata, generalSettingsMetadata,
            billingSettingsMetadata, loginMetadata, authMetadata, reportAbuseMetadata, inspectMetadata].map((m) => m.title);

        expect(new Set(titles).size).toBe(titles.length);
    });
});
