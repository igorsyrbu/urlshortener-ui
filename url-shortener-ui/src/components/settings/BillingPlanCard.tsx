import {Check, Zap} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {ButtonSpinner} from "@/components/ui/button-spinner";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
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
}

function renderFeatures(plan: BillingPlan): React.ReactNode {
    return (
        <ul className="space-y-3" aria-label={`${plan.name} features`}>
            {plan.features.map((feature) => (
                <li key={feature} className="flex min-w-0 items-start gap-3 text-sm">
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

export function BillingPlanCard({plan, cycle, isCurrent, isUpgrading, isPeriodSwitchable, isSchedulingPeriod, onUpgrade}: BillingPlanCardProps) {
    const isFree = plan.id === "free";
    const price = isFree ? BILLING_COPY.FREE_PRICE : BILLING_PRICES[cycle].monthlyPrice;
    const description = isFree ? BILLING_COPY.FREE_DESCRIPTION : BILLING_PRICES[cycle].description;
    const isUpgradePending = !isCurrent && !isFree && isUpgrading;
    const isSwitchPending = isPeriodSwitchable && isSchedulingPeriod;
    const isButtonDisabled = (isCurrent && !isPeriodSwitchable) || isFree || isUpgrading || isSchedulingPeriod;
    const busyLabel = isSwitchPending ? BILLING_COPY.SWITCHING_PERIOD : isUpgradePending ? BILLING_COPY.UPGRADING : undefined;
    return (
        <Card role="region" aria-label={`${plan.name} plan`} className={cn("min-w-0", isCurrent && "border-primary ring-1 ring-primary")}>
            <CardHeader className="min-w-0 gap-4">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <CardTitle className="min-w-0 text-lg"><h3 className="truncate" title={plan.name}>{plan.name}</h3></CardTitle>
                    {isCurrent && <Badge className="border-transparent bg-primary/10 text-primary hover:bg-primary/10">{BILLING_COPY.CURRENT_PLAN}</Badge>}
                </div>
                <BillingPrice price={price}/>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="min-w-0 flex-1 space-y-4">
                {plan.description && <p className="break-all text-sm text-muted-foreground">{plan.description}</p>}
                {renderFeatures(plan)}
            </CardContent>
            <CardFooter>
                <Button className="w-full" variant={isFree || (isCurrent && !isPeriodSwitchable) ? "outline" : "default"}
                        disabled={isButtonDisabled} aria-busy={isUpgradePending || isSwitchPending}
                        aria-label={busyLabel} onClick={onUpgrade}>
                    {renderUpgradeLabel(plan, isCurrent, isUpgrading, isPeriodSwitchable, isSchedulingPeriod)}
                </Button>
            </CardFooter>
        </Card>
    );
}
