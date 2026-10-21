import {Check, Zap} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {SETTINGS_CARD_WITH_FOOTER_CLASS, SettingsCardFooter} from "@/components/settings/SettingsCardFooter";
import {BillingPrice} from "@/components/settings/BillingPrice";
import {BILLING_COPY, BILLING_PRICES, type BillingCycle, type BillingPlan} from "@/lib/billing-constants";
import {cn} from "@/lib/utils";

interface BillingPlanCardProps {
    plan: BillingPlan;
    cycle: BillingCycle;
    isCurrent: boolean;
    isUpgrading: boolean;
    isPeriodSwitchable: boolean;
    isSchedulingPeriod: boolean;
    onUpgrade: () => void;
    isLoading?: boolean;
}

function renderFeatures(plan: BillingPlan): React.ReactNode {
    return (
        <ul className="flex flex-col gap-2" aria-label={`${plan.name} features`}>
            {plan.features.map((feature) => (
                <li key={feature} className="flex min-w-0 items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true"/>
                    <span className="min-w-0 break-words">{feature}</span>
                </li>
            ))}
        </ul>
    );
}

function renderUpgradeLabel(plan: BillingPlan, isCurrent: boolean, isUpgrading: boolean, isPeriodSwitchable: boolean, isSchedulingPeriod: boolean): React.ReactNode {
    if (isCurrent && !isPeriodSwitchable) return BILLING_COPY.CURRENT_PLAN;
    if (plan.id === "free") return plan.name;
    if (isPeriodSwitchable) {
        if (isSchedulingPeriod) return <>{<ButtonSpinner/>}{BILLING_COPY.SWITCHING_PERIOD}</>;
        return BILLING_COPY.SWITCH_TO_YEARLY;
    }
    if (isUpgrading) return <>{<ButtonSpinner/>}{BILLING_COPY.UPGRADING}</>;
    return <>{<Zap aria-hidden="true"/>}{BILLING_COPY.UPGRADE}</>;
}

function renderAction(plan: BillingPlan, props: BillingPlanCardProps): React.ReactNode {
    const {isCurrent, isUpgrading, isPeriodSwitchable, isSchedulingPeriod, onUpgrade} = props;
    if (props.isLoading) return <div aria-hidden="true" className="h-9 w-full rounded-md bg-muted animate-pulse"/>;
    const isFree = plan.id === "free";
    const isUpgradePending = !isCurrent && !isFree && isUpgrading;
    const isSwitchPending = isPeriodSwitchable && isSchedulingPeriod;
    const isButtonDisabled = (isCurrent && !isPeriodSwitchable) || isFree || isUpgrading || isSchedulingPeriod;
    const busyLabel = isSwitchPending ? BILLING_COPY.SWITCHING_PERIOD : isUpgradePending ? BILLING_COPY.UPGRADING : undefined;
    return (
        <Button className="w-full" variant={isFree || (isCurrent && !isPeriodSwitchable) ? "outline" : "default"}
                disabled={isButtonDisabled} aria-busy={isUpgradePending || isSwitchPending}
                aria-label={busyLabel} onClick={onUpgrade}>
            {renderUpgradeLabel(plan, isCurrent, isUpgrading, isPeriodSwitchable, isSchedulingPeriod)}
        </Button>
    );
}

export function BillingPlanCard(props: BillingPlanCardProps) {
    const {plan, cycle, isCurrent, isLoading = false} = props;
    const isFree = plan.id === "free";
    const price = isFree ? BILLING_COPY.FREE_PRICE : BILLING_PRICES[cycle].monthlyPrice;
    const description = isFree ? BILLING_COPY.FREE_DESCRIPTION : BILLING_PRICES[cycle].description;
    const isShownAsCurrent = isCurrent && !isLoading;
    return (
        <Card role="region" aria-label={`${plan.name} plan`}
              className={cn("min-w-0 gap-4", SETTINGS_CARD_WITH_FOOTER_CLASS, isShownAsCurrent && "border-primary ring-1 ring-primary")}>
            {/* leading-6 keeps the row as tall as the "Current plan" badge, which appears only after loading. */}
            <CardHeader className="flex min-w-0 items-center justify-between gap-2 border-b-[0.5px] border-border pb-4">
                <CardTitle className="min-w-0 text-sm leading-6"><h3 className="truncate" title={plan.name}>{plan.name}</h3></CardTitle>
                {isShownAsCurrent && <Badge className="border-transparent bg-primary/10 text-primary hover:bg-primary/10">{BILLING_COPY.CURRENT_PLAN}</Badge>}
            </CardHeader>
            <CardContent className="flex min-w-0 flex-1 flex-col gap-4">
                <div className="flex flex-col gap-1">
                    <BillingPrice price={price}/>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                {plan.description && <p className="break-all text-sm font-medium text-foreground">{plan.description}</p>}
                {renderFeatures(plan)}
            </CardContent>
            <SettingsCardFooter>
                {renderAction(plan, props)}
            </SettingsCardFooter>
        </Card>
    );
}
