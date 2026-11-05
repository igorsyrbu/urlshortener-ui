import type {LucideIcon} from "lucide-react";
import type {ReactNode} from "react";
import {Card, CardContent} from "@/components/ui/card";

interface LandingCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    /** The card's action: a form or a link button. */
    children: ReactNode;
}

/** One entry point on the landing page: icon, title, a short line and the action that leads there. */
export function LandingCard({icon: Icon, title, description, children}: LandingCardProps) {
    return (
        <Card className="min-w-0">
            <CardContent className="flex h-full min-w-0 flex-col gap-4">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true"/>
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="text-base font-semibold text-foreground">{title}</h2>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="mt-auto min-w-0">{children}</div>
            </CardContent>
        </Card>
    );
}
