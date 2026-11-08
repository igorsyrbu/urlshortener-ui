import type {LucideIcon} from "lucide-react";
import type {ReactNode} from "react";
import {cn} from "@/lib/utils";

interface LandingCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    /** The card's action: a form or a link button. */
    children: ReactNode;
    className?: string;
}

/** One entry point on the landing page: icon, title, a short line and the action that leads there; lifts on hover. */
export function LandingCard({icon: Icon, title, description, children, className}: LandingCardProps) {
    return (
        <div className={cn(
            "group relative flex min-w-0 flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-soft",
            "transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg motion-reduce:hover:translate-y-0",
            className,
        )}>
            <div aria-hidden="true"
                 className="pointer-events-none absolute -top-16 -right-16 size-40 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"/>
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Icon className="size-5" aria-hidden="true"/>
            </span>
            <div className="flex min-w-0 flex-col gap-1.5">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="min-w-0">{children}</div>
        </div>
    );
}
