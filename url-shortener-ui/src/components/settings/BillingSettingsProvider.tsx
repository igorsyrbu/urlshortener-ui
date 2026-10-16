"use client";

import {createContext, useCallback, useContext, useState, type ReactNode} from "react";
import type {BillingCycle} from "@/lib/billing-constants";
import {useBillingCheckout, type BillingCheckoutState} from "@/lib/hooks/useBillingCheckout";
import {useBillingPeriodUpgrade, type BillingPeriodUpgradeState} from "@/lib/hooks/useBillingPeriodUpgrade";
import {useBillingPortal, type BillingPortalState} from "@/lib/hooks/useBillingPortal";
import {useBillingSubscription, type BillingSubscriptionState} from "@/lib/hooks/useBillingSubscription";

interface BillingSettingsContextValue {
    cycle: BillingCycle;
    handleCycleChange: (cycle: BillingCycle) => void;
    handlePortalReturn: () => Promise<void>;
    subscription: BillingSubscriptionState;
    checkout: BillingCheckoutState;
    periodUpgrade: BillingPeriodUpgradeState;
    portal: BillingPortalState;
}

interface BillingSettingsProviderProps {
    children: ReactNode;
}

const BillingSettingsContext = createContext<BillingSettingsContextValue | null>(null);

export function BillingSettingsProvider({children}: BillingSettingsProviderProps) {
    const [cycle, setCycle] = useState<BillingCycle>("monthly");
    const subscription = useBillingSubscription();
    const portal = useBillingPortal();
    const checkout = useBillingCheckout(cycle, subscription.handleRetry);
    const periodUpgrade = useBillingPeriodUpgrade(subscription.handleRetry, subscription.refreshSilently);
    const {refreshSilently} = subscription;
    const {clearScheduledSwitch} = periodUpgrade;
    const handlePortalReturn = useCallback(async (): Promise<void> => {
        const hasRefreshed = await refreshSilently();
        // The first refresh after scheduling can lag; returning from the portal replaces that optimistic state.
        if (hasRefreshed) clearScheduledSwitch();
    }, [refreshSilently, clearScheduledSwitch]);

    return (
        <BillingSettingsContext.Provider
            value={{cycle, handleCycleChange: setCycle, handlePortalReturn, subscription, checkout, periodUpgrade, portal}}>
            {children}
        </BillingSettingsContext.Provider>
    );
}

export function useBillingSettings(): BillingSettingsContextValue {
    const context = useContext(BillingSettingsContext);
    if (!context) throw new Error("Billing settings require BillingSettingsProvider.");
    return context;
}
