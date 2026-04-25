import React from "react";

interface PageHeadingProps {
    children: React.ReactNode;
}

export function PageHeading({children}: PageHeadingProps) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
                {children}
            </h2>
        </div>
    );
}
