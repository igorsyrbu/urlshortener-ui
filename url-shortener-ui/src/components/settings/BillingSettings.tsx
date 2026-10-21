"use client";

import {useEffect, useId, useState} from "react";
import dynamic from "next/dynamic";
import {Button} from "@/components/ui/button";
import {BillingCurrentPlanCard} from "@/components/settings/BillingCurrentPlanCard";
import {SettingsCallout} from "@/components/settings/SettingsCallout";
import {SETTINGS_SECTION_LIST_CLASS, SettingsSection} from "@/components/settings/SettingsSection";
import {SETTINGS_SECTION_COPY} from "@/lib/settings-constants";
import {BillingCycleSelector} from "@/components/settings/BillingCycleSelector";
import {BillingPlanCard} from "@/components/settings/BillingPlanCard";
import {BILLING_COPY, BILLING_PLANS, isProSubscription} from "@/lib/billing-constants";
import {clearPortalReturn, peekPortalReturn} from "@/lib/billing-portal-return";
import {useBillingSettings} from "@/components/settings/BillingSettingsProvider";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";

const PeriodSwitchConfirmModal = dynamic(
    () => import("@/components/settings/PeriodSwitchConfirmModal").then((modalModule) => modalModule.PeriodSwitchConfirmModal),
    {ssr: false},
);

export function BillingSettings() {
    const {cycle, handleCycleChange, handlePortalReturn, subscription, checkout, periodUpgrade, portal} = useBillingSettings();
    const isPro = isProSubscription(subscription.subscription);
    const isBusy = subscription.isLoading || checkout.isRedirecting || periodUpgrade.isScheduling || portal.isManaging;
    const hasScheduledSwitch = periodUpgrade.scheduledSwitch !== null || subscription.subscription.pendingSwitch !== null;
    const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);
    const hasOpenedSwitchConfirm = useHasBeenOpened(isSwitchConfirmOpen);
    const plansHeadingId = useId();

    useEffect(() => {
        // The flag is cleared only after a successful refresh, so a failed one is tried again on the next return.
        async function refreshOnReturn(): Promise<void> {
            if (!peekPortalReturn()) return;
            if (await handlePortalReturn()) clearPortalReturn();
        }

        function handleVisibilityChange(): void {
            if (document.visibilityState === "visible") void refreshOnReturn();
        }

        function handleFocus(): void {
            void refreshOnReturn();
        }

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [handlePortalReturn]);

    function handleUpgrade(): void {
        if (isPro && cycle === "yearly") {
            setIsSwitchConfirmOpen(true);
            return;
        }
        void checkout.handleUpgrade();
    }

    function handleSwitchConfirm(): void {
        setIsSwitchConfirmOpen(false);
        void periodUpgrade.handleSwitch();
    }

    function isPeriodSwitchable(planId: string): boolean {
        return isPro && planId === "pro" && cycle === "yearly" && periodUpgrade.scheduledSwitch === null
            && subscription.subscription.pendingSwitch === null;
    }

    if (subscription.errorMessage) {
        return (
            <div className="flex min-w-0 flex-col items-start gap-3">
                <SettingsCallout tone="destructive" isAlert className="w-full">{subscription.errorMessage}</SettingsCallout>
                <Button variant="outline" onClick={subscription.handleRetry}>{BILLING_COPY.RETRY}</Button>
            </div>
        );
    }

    return (
        <div className={SETTINGS_SECTION_LIST_CLASS}>
            <SettingsSection {...SETTINGS_SECTION_COPY.CURRENT_PLAN}>
                <BillingCurrentPlanCard subscription={subscription.subscription} scheduledSwitch={periodUpgrade.scheduledSwitch}
                                        portal={portal} isLoading={subscription.isLoading}/>
            </SettingsSection>
            <section aria-labelledby={plansHeadingId} className="flex min-w-0 flex-col gap-4 py-8 last:pb-0">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <h2 id={plansHeadingId} className="text-sm font-semibold text-foreground">{BILLING_COPY.PLANS_TITLE}</h2>
                        <p className="text-sm text-muted-foreground">{BILLING_COPY.DESCRIPTION}</p>
                    </div>
                    <BillingCycleSelector cycle={cycle} isDisabled={isBusy || hasScheduledSwitch} onCycleChange={handleCycleChange}/>
                </div>
                <div className="@container min-w-0">
                    <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
                        {BILLING_PLANS.map((plan) => (
                            <BillingPlanCard key={plan.id} plan={plan} isCurrent={subscription.subscription.planId === plan.id}
                                             cycle={cycle} isUpgrading={checkout.isRedirecting}
                                             isPeriodSwitchable={isPeriodSwitchable(plan.id)}
                                             isSchedulingPeriod={periodUpgrade.isScheduling} onUpgrade={handleUpgrade}
                                             isLoading={subscription.isLoading}/>
                        ))}
                    </div>
                </div>
                {checkout.errorMessage && <SettingsCallout tone="destructive" isAlert>{checkout.errorMessage}</SettingsCallout>}
                {periodUpgrade.errorMessage && <SettingsCallout tone="destructive" isAlert>{periodUpgrade.errorMessage}</SettingsCallout>}
            </section>
            {isPro && hasOpenedSwitchConfirm && <PeriodSwitchConfirmModal open={isSwitchConfirmOpen} onOpenChange={setIsSwitchConfirmOpen}
                                                                          onConfirm={handleSwitchConfirm}/>}
        </div>
    );
}
