"use client";

import {useEffect, useState} from "react";
import dynamic from "next/dynamic";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {ExternalLink} from "lucide-react";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {BillingCycleSelector} from "@/components/settings/BillingCycleSelector";
import {BillingPlanCard} from "@/components/settings/BillingPlanCard";
import {BILLING_COPY, BILLING_PLANS, isProSubscription} from "@/lib/billing-constants";
import {consumePortalReturn} from "@/lib/billing-portal-return";
import {useBillingSettings} from "@/components/settings/BillingSettingsProvider";
import type {BillingPortalState} from "@/lib/hooks/useBillingPortal";
import type {BillingSubscription, ScheduledPeriodSwitch} from "@/lib/billing-constants";
import {useHasBeenOpened} from "@/lib/hooks/useHasBeenOpened";

const PeriodSwitchConfirmModal = dynamic(
    () => import("@/components/settings/PeriodSwitchConfirmModal").then((modalModule) => modalModule.PeriodSwitchConfirmModal),
    {ssr: false},
);

function formatPeriodEnd(currentPeriodEnd: string | undefined): string | null {
    if (!currentPeriodEnd) return null;
    const parsed = new Date(currentPeriodEnd);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
}

function renderScheduledNote(scheduledSwitch: ScheduledPeriodSwitch): React.ReactNode {
    const switchDate = formatPeriodEnd(scheduledSwitch.effectiveDate ?? undefined);
    if (switchDate === null) {
        return <p className="min-w-0 break-words text-sm text-muted-foreground">{BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL}</p>;
    }
    return (
        <p className="min-w-0 truncate text-sm text-muted-foreground" title={switchDate}>
            {`${BILLING_COPY.SWITCHES_TO_YEARLY_ON} ${switchDate}`}
        </p>
    );
}

function renderPeriodNote(subscription: BillingSubscription, scheduledSwitch: ScheduledPeriodSwitch | null): React.ReactNode {
    const effectiveSwitch = subscription.pendingSwitch ?? scheduledSwitch;
    if (effectiveSwitch !== null) return renderScheduledNote(effectiveSwitch);
    const periodEnd = formatPeriodEnd(subscription.currentPeriodEnd);
    if (periodEnd === null) return null;
    return (
        <p className="min-w-0 truncate text-sm text-muted-foreground" title={periodEnd}>
            {subscription.cancelAtPeriodEnd ? `${BILLING_COPY.CANCELS_ON} ${periodEnd}` : `${BILLING_COPY.RENEWS_ON} ${periodEnd}`}
        </p>
    );
}

function renderManageSection(subscription: BillingSubscription, portal: BillingPortalState, scheduledSwitch: ScheduledPeriodSwitch | null): React.ReactNode {
    return (
        <div className="min-w-0 space-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
                <Button variant="outline" disabled={portal.isManaging} aria-busy={portal.isManaging}
                        aria-label={portal.isManaging ? BILLING_COPY.MANAGING_SUBSCRIPTION : BILLING_COPY.MANAGE_SUBSCRIPTION}
                        onClick={() => void portal.handleManage()}>
                    {portal.isManaging ? <ButtonSpinner/> : <ExternalLink aria-hidden="true"/>}
                    {portal.isManaging ? BILLING_COPY.MANAGING_SUBSCRIPTION : BILLING_COPY.MANAGE_SUBSCRIPTION}
                </Button>
                {renderPeriodNote(subscription, scheduledSwitch)}
            </div>
            {portal.errorMessage && <p role="alert" className="min-w-0 break-all text-sm text-destructive">{portal.errorMessage}</p>}
        </div>
    );
}

export function BillingSettings() {
    const {cycle, handleCycleChange, handlePortalReturn, subscription, checkout, periodUpgrade, portal} = useBillingSettings();
    const isPro = isProSubscription(subscription.subscription);
    const isBusy = subscription.isLoading || checkout.isRedirecting || periodUpgrade.isScheduling || portal.isManaging;
    const hasScheduledSwitch = periodUpgrade.scheduledSwitch !== null || subscription.subscription.pendingSwitch !== null;
    const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);
    const hasOpenedSwitchConfirm = useHasBeenOpened(isSwitchConfirmOpen);

    useEffect(() => {
        function refreshOnReturn(): void {
            if (!isProSubscription(subscription.subscription)) return;
            if (consumePortalReturn()) void handlePortalReturn();
        }

        function handleVisibilityChange(): void {
            if (document.visibilityState === "visible") refreshOnReturn();
        }

        window.addEventListener("focus", refreshOnReturn);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            window.removeEventListener("focus", refreshOnReturn);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [subscription.subscription, handlePortalReturn]);

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

    return (
        <Card className="min-w-0">
            <CardHeader className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                    <CardTitle><h2>{BILLING_COPY.TITLE}</h2></CardTitle>
                    <CardDescription>{BILLING_COPY.DESCRIPTION}</CardDescription>
                </div>
                <BillingCycleSelector cycle={cycle} isDisabled={isBusy || hasScheduledSwitch} onCycleChange={handleCycleChange}/>
            </CardHeader>
            <CardContent className="@container min-w-0 space-y-6">
                {subscription.isLoading && <span role="status" aria-label={BILLING_COPY.SUBSCRIPTION_LOADING} className="sr-only">{BILLING_COPY.SUBSCRIPTION_LOADING}</span>}
                {subscription.errorMessage && (
                    <div className="min-w-0 space-y-2">
                        <p role="alert" className="min-w-0 break-all text-sm text-destructive">{subscription.errorMessage}</p>
                        <Button variant="outline" onClick={subscription.handleRetry}>{BILLING_COPY.RETRY}</Button>
                    </div>
                )}
                {!subscription.errorMessage && (
                    <>
                        <div className="grid min-w-0 gap-4 @xl:grid-cols-2">
                            {BILLING_PLANS.map((plan) => (
                                <BillingPlanCard key={plan.id} plan={plan} isCurrent={subscription.subscription.planId === plan.id}
                                                 cycle={cycle} isUpgrading={checkout.isRedirecting}
                                                 isPeriodSwitchable={isPeriodSwitchable(plan.id)}
                                                 isSchedulingPeriod={periodUpgrade.isScheduling} onUpgrade={handleUpgrade}
                                                 isLoading={subscription.isLoading}/>
                            ))}
                        </div>
                        {checkout.errorMessage && <p role="alert" className="min-w-0 break-all text-sm text-destructive">{checkout.errorMessage}</p>}
                        {periodUpgrade.errorMessage && <p role="alert" className="min-w-0 break-all text-sm text-destructive">{periodUpgrade.errorMessage}</p>}
                        {isPro && renderManageSection(subscription.subscription, portal, periodUpgrade.scheduledSwitch)}
                        {isPro && hasOpenedSwitchConfirm && <PeriodSwitchConfirmModal open={isSwitchConfirmOpen} onOpenChange={setIsSwitchConfirmOpen}
                                                             onConfirm={handleSwitchConfirm}/>}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
