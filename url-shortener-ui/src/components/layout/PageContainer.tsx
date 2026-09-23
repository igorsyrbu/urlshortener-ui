import React from "react";
import {cn} from "@/lib/utils";

interface PageContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function PageContainer({children, className}: PageContainerProps) {
    return (
        <div className={cn("flex w-full flex-col gap-4 pb-12", className)}>
            {children}
        </div>
    );
}
