"use client";

import {Card, CardContent} from "@/components/ui/card";
import {SessionRowSkeleton} from "@/components/settings/SessionRowSkeleton";

export const SESSION_CARD_CLASS = "gap-0 overflow-hidden py-0";

export function SessionCardSkeleton() {
    return (
        <Card role="status" aria-label="Loading sessions" className={SESSION_CARD_CLASS}>
            <CardContent className="p-0">
                <SessionRowSkeleton/>
            </CardContent>
        </Card>
    );
}
