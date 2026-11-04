"use client";

import {useState} from "react";
import type {BillingCycle} from "@/lib/billing-constants";
import {useBillingActionLock} from "@/lib/hooks/useBillingActionLock";
import {useBillingCheckout, type BillingCheckoutState} from "@/lib/hooks/useBillingCheckout";
import {useBillingPeriodUpgrade, type BillingPeriodUpgradeState} from "@/lib/hooks/useBillingPeriodUpgrade";
import {useBillingPortal, type BillingPortalState} from "@/lib/hooks/useBillingPortal";
import {useBillingSubscription, type BillingSubscriptionState} from "@/lib/hooks/useBillingSubscription";

interface BillingSettingsState {
    cycle: BillingCycle;
    handleCycleChange: (cycle: BillingCycle) => void;
    subscription: BillingSubscriptionState;
    checkout: BillingCheckoutState;
    periodUpgrade: BillingPeriodUpgradeState;
    portal: BillingPortalState;
    /** True while any billing action (checkout, portal, period switch) runs; every action button is disabled then. */
    isActionPending: boolean;
}

/** The billing page's subscription and actions; one billing action at a time (`useBillingActionLock`). */
export function useBillingSettings(): BillingSettingsState {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");
    const subscription = useBillingSubscription();
    const lock = useBillingActionLock();
    const portalState = useBillingPortal();
    const checkoutState = useBillingCheckout(cycle, subscription.refreshSubscription);
    const periodUpgradeState = useBillingPeriodUpgrade(subscription.refreshSubscription, subscription.showScheduledSwitch);
    const portal = {...portalState, handleManage: () => lock.run(portalState.handleManage)};
    const checkout = {...checkoutState, handleUpgrade: () => lock.run(checkoutState.handleUpgrade)};
    const periodUpgrade = {...periodUpgradeState, handleSwitch: () => lock.run(periodUpgradeState.handleSwitch)};
    const isActionPending = lock.isLocked || checkout.isRedirecting || portal.isManaging || periodUpgrade.isScheduling;

    return {cycle, handleCycleChange: setCycle, subscription, checkout, periodUpgrade, portal, isActionPending};
}
