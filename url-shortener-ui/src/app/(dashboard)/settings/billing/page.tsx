import {BillingSettings} from "@/components/settings/BillingSettings";
import {BillingSettingsProvider} from "@/components/settings/BillingSettingsProvider";

export default function BillingSettingsPage() {
    return (
        <BillingSettingsProvider>
            <BillingSettings/>
        </BillingSettingsProvider>
    );
}
