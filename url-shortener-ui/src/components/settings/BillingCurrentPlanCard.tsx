import {ExternalLink} from "lucide-react";
import {Badge, type BadgeVariant} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Card, CardContent} from "@/components/ui/card";
import {SettingsCallout} from "@/components/settings/SettingsCallout";
import {SETTINGS_CARD_WITH_FOOTER_CLASS, SettingsCardFooter} from "@/components/settings/SettingsCardFooter";
import {
    BILLING_COPY,
    BILLING_PLANS,
    isProSubscription,
    type BillingSubscription,
    type ScheduledPeriodSwitch,
} from "@/lib/billing-constants";
import type {BillingPortalState} from "@/lib/hooks/useBillingPortal";
import {cn} from "@/lib/utils";

interface BillingCurrentPlanCardProps {
    subscription: BillingSubscription;
    scheduledSwitch: ScheduledPeriodSwitch | null;
    portal: BillingPortalState;
    isLoading: boolean;
    /** Another billing action is running; Manage waits for it. */
    isActionPending?: boolean;
}

interface PlanStatus {
    label: string;
    variant: BadgeVariant;
}

const TEXT_PULSE_CLASS = "inline-block rounded bg-muted animate-pulse";

function formatPeriodEnd(currentPeriodEnd: string | undefined): string | null {
    if (!currentPeriodEnd) return null;
    const parsed = new Date(currentPeriodEnd);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
}

function getPlanStatus(subscription: BillingSubscription, hasScheduledSwitch: boolean): PlanStatus {
    if (!isProSubscription(subscription)) return {label: BILLING_COPY.STATUS_FREE, variant: "gray"};
    if (subscription.cancelAtPeriodEnd) return {label: BILLING_COPY.STATUS_CANCELING, variant: "yellow"};
    if (hasScheduledSwitch) return {label: BILLING_COPY.STATUS_PENDING_CHANGE, variant: "yellow"};
    return {label: BILLING_COPY.STATUS_ACTIVE, variant: "green"};
}

function getPlanName(subscription: BillingSubscription): string {
    return BILLING_PLANS.find((plan) => plan.id === subscription.planId)?.name ?? subscription.planId;
}

function renderPeriodNote(subscription: BillingSubscription): React.ReactNode {
    if (!isProSubscription(subscription)) return <p className="text-sm text-muted-foreground">{BILLING_COPY.FREE_PLAN_NOTE}</p>;
    const periodEnd = formatPeriodEnd(subscription.currentPeriodEnd);
    if (periodEnd === null) return null;
    const label = subscription.cancelAtPeriodEnd ? BILLING_COPY.CANCELS_ON : BILLING_COPY.RENEWS_ON;
    const text = `${label} ${periodEnd}`;
    return <p className="min-w-0 truncate text-sm text-muted-foreground" title={text}>{text}</p>;
}

function renderScheduledSwitch(scheduledSwitch: ScheduledPeriodSwitch): React.ReactNode {
    const switchDate = formatPeriodEnd(scheduledSwitch.effectiveDate ?? undefined);
    const message = switchDate === null
        ? BILLING_COPY.SWITCHES_TO_YEARLY_AT_RENEWAL
        : `${BILLING_COPY.SWITCHES_TO_YEARLY_ON} ${switchDate}`;
    return <SettingsCallout tone="info">{message}</SettingsCallout>;
}

/** While the subscription loads, the Free layout with placeholders: the default plan, so most visits move nothing. */
function renderLoadingContent(): React.ReactNode {
    return (
        <div aria-hidden="true" className="flex min-w-0 flex-col gap-3">
            <div className="flex min-w-0 items-center gap-2">
                <p className="text-sm font-semibold"><span className={cn(TEXT_PULSE_CLASS, "w-12")}>&nbsp;</span></p>
                <Badge variant="gray" className="border-transparent bg-muted text-transparent animate-pulse">{BILLING_COPY.STATUS_FREE}</Badge>
            </div>
            {/* The real note, hidden: on a phone it wraps, and a one-line bar would make the card grow when it loads. */}
            <p className="text-sm"><span className="rounded bg-muted text-transparent box-decoration-clone animate-pulse">{BILLING_COPY.FREE_PLAN_NOTE}</span></p>
        </div>
    );
}

function renderManageButton(portal: BillingPortalState, isActionPending: boolean): React.ReactNode {
    return (
        <Button variant="outline" disabled={portal.isManaging || isActionPending} aria-busy={portal.isManaging}
                aria-label={portal.isManaging ? BILLING_COPY.MANAGING_SUBSCRIPTION : BILLING_COPY.MANAGE_SUBSCRIPTION}
                onClick={() => void portal.handleManage()}>
            {portal.isManaging ? <ButtonSpinner/> : <ExternalLink aria-hidden="true"/>}
            {portal.isManaging ? BILLING_COPY.MANAGING_SUBSCRIPTION : BILLING_COPY.MANAGE_SUBSCRIPTION}
        </Button>
    );
}

export function BillingCurrentPlanCard({subscription, scheduledSwitch, portal, isLoading, isActionPending = false}: BillingCurrentPlanCardProps) {
    if (isLoading) {
        // The status lives on the card, not beside the sections: an extra first child would cost "Current plan" its first:pt-0.
        return (
            <Card role="status" aria-label={BILLING_COPY.SUBSCRIPTION_LOADING} className="min-w-0">
                <CardContent>{renderLoadingContent()}</CardContent>
            </Card>
        );
    }
    const effectiveSwitch = subscription.pendingSwitch ?? scheduledSwitch;
    const status = getPlanStatus(subscription, effectiveSwitch !== null);
    const isPro = isProSubscription(subscription);
    const planName = getPlanName(subscription);

    return (
        <Card className={cn("min-w-0", isPro && SETTINGS_CARD_WITH_FOOTER_CLASS)}>
            <CardContent className="flex min-w-0 flex-col gap-3">
                <div className="flex min-w-0 items-center gap-2">
                    <p className="min-w-0 truncate text-sm font-semibold text-foreground" title={planName}>{planName}</p>
                    <Badge variant={status.variant}>{status.label}</Badge>
                </div>
                {renderPeriodNote(subscription)}
                {effectiveSwitch !== null && renderScheduledSwitch(effectiveSwitch)}
                {portal.errorMessage && <SettingsCallout tone="destructive" isAlert>{portal.errorMessage}</SettingsCallout>}
            </CardContent>
            {isPro && <SettingsCardFooter>{renderManageButton(portal, isActionPending)}</SettingsCardFooter>}
        </Card>
    );
}
