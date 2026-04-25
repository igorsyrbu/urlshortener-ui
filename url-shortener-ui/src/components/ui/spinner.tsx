import {cn} from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
    size?: SpinnerSize;
    className?: string;
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
    sm: "size-4",
    md: "size-6",
    lg: "size-8",
};

export function Spinner({size = "md", className}: SpinnerProps) {
    return (
        <div
            className={cn(
                "border-4 border-primary/20 border-t-primary rounded-full animate-spin",
                SIZE_CLASSES[size],
                className,
            )}
        />
    );
}
