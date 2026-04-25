import React from "react";

interface PageContainerProps {
    children: React.ReactNode;
}

export function PageContainer({children}: PageContainerProps) {
    return (
        <div className="-mt-6 flex w-full flex-col gap-6 pb-12">
            {children}
        </div>
    );
}
