import type {Metadata} from "next";
import {SETTINGS_LABELS} from "@/lib/settings-constants";
import {PAGE_TITLES} from "@/lib/constants";
import {BillingSettings} from "@/components/settings/BillingSettings";
import {BillingSettingsProvider} from "@/components/settings/BillingSettingsProvider";

export const metadata: Metadata = {title: `${SETTINGS_LABELS.BILLING} · ${PAGE_TITLES.SETTINGS}`};

export default function BillingSettingsPage() {
    return (
        <BillingSettingsProvider>
            <BillingSettings/>
        </BillingSettingsProvider>
    );
}
