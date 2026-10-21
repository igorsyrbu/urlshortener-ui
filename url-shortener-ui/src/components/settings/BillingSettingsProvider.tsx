"use client";

import {createContext, useCallback, useContext, useState, type ReactNode} from "react";
import type {BillingCycle} from "@/lib/billing-constants";
import {useBillingCheckout, type BillingCheckoutState} from "@/lib/hooks/useBillingCheckout";
import {useBillingPeriodUpgrade, type BillingPeriodUpgradeState} from "@/lib/hooks/useBillingPeriodUpgrade";
import {useBillingPortal, type BillingPortalState} from "@/lib/hooks/useBillingPortal";
import {useBillingSubscription, type BillingSubscriptionState} from "@/lib/hooks/useBillingSubscription";
import {useBillingActionLock} from "@/lib/hooks/useBillingActionLock";

interface BillingSettingsContextValue {
    cycle: BillingCycle;
    handleCycleChange: (cycle: BillingCycle) => void;
    /** Refreshes after a portal visit; true when the refresh succeeded. */
    handlePortalReturn: () => Promise<boolean>;
    subscription: BillingSubscriptionState;
    checkout: BillingCheckoutState;
    periodUpgrade: BillingPeriodUpgradeState;
    portal: BillingPortalState;
    /** True while any billing action (checkout, portal, period switch) runs; every action button is disabled then. */
    isActionPending: boolean;
}

interface BillingSettingsProviderProps {
    children: ReactNode;
}

const BillingSettingsContext = createContext<BillingSettingsContextValue | null>(null);

export function BillingSettingsProvider({children}: BillingSettingsProviderProps) {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");
    const subscription = useBillingSubscription();
    const lock = useBillingActionLock();
    const portalState = useBillingPortal();
    const checkoutState = useBillingCheckout(cycle, subscription.handleRetry);
    const periodUpgradeState = useBillingPeriodUpgrade(subscription.handleRetry, subscription.refreshSilently);
    const portal = {...portalState, handleManage: () => lock.run(portalState.handleManage)};
    const checkout = {...checkoutState, handleUpgrade: () => lock.run(checkoutState.handleUpgrade)};
    const periodUpgrade = {...periodUpgradeState, handleSwitch: () => lock.run(periodUpgradeState.handleSwitch)};
    const isActionPending = lock.isLocked || checkout.isRedirecting || portal.isManaging || periodUpgrade.isScheduling;
    const {refreshSilently} = subscription;
    const {clearScheduledSwitch} = periodUpgrade;
    const handlePortalReturn = useCallback(async (): Promise<boolean> => {
        const hasRefreshed = await refreshSilently();
        // The first refresh after scheduling can lag; returning from the portal replaces that optimistic state.
        if (hasRefreshed) clearScheduledSwitch();
        return hasRefreshed;
    }, [refreshSilently, clearScheduledSwitch]);

    return (
        <BillingSettingsContext.Provider
            value={{cycle, handleCycleChange: setCycle, handlePortalReturn, subscription, checkout, periodUpgrade, portal, isActionPending}}>
            {children}
        </BillingSettingsContext.Provider>
    );
}

export function useBillingSettings(): BillingSettingsContextValue {
    const context = useContext(BillingSettingsContext);
    if (!context) throw new Error("Billing settings require BillingSettingsProvider.");
    return context;
}
