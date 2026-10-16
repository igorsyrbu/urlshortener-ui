import {SegmentedControl} from "@/components/ui/segmented-control";
import {BILLING_COPY, type BillingCycle} from "@/lib/billing-constants";

interface BillingCycleSelectorProps {
    cycle: BillingCycle;
    isDisabled: boolean;
    onCycleChange: (cycle: BillingCycle) => void;
}

function handleBillingCycleChange(value: string, onCycleChange: (cycle: BillingCycle) => void): void {
    if (value !== "monthly" && value !== "yearly") return;
    onCycleChange(value);
}

export function BillingCycleSelector({cycle, isDisabled, onCycleChange}: BillingCycleSelectorProps) {
    return (
        <SegmentedControl
            ariaLabel={BILLING_COPY.CYCLE_LABEL}
            value={cycle}
            isDisabled={isDisabled}
            onValueChange={(value) => handleBillingCycleChange(value, onCycleChange)}
            options={[
                {value: "monthly", label: BILLING_COPY.MONTHLY},
                {
                    value: "yearly",
                    label: BILLING_COPY.YEARLY,
                    suffix: <span className="text-xs font-semibold text-success">{BILLING_COPY.SAVINGS}</span>,
                },
            ]}
        />
    );
}
