import React from "react";

interface PageContainerProps {
    children: React.ReactNode;
}

export function PageContainer({children}: PageContainerProps) {
    return (
        <div className="flex w-full flex-col gap-4 pb-12">
            {children}
        </div>
    );
}
